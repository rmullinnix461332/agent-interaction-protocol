import { useCallback } from 'react'
import {
  Accordion, AccordionSummary, AccordionDetails,
  Typography, TextField, Box, Chip, Button, Divider,
  Select, MenuItem, FormControl, InputLabel, IconButton,
  Autocomplete,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import ClearIcon from '@mui/icons-material/Clear'
import { useFlowState, useFlowDispatch } from '@/store/flow-context'
import { useUIState, useUIDispatch } from '@/store/ui-context'
import type { Step, StepType, Operator, Iteration, AwaitInput, Exit, DecisionCase } from '@/model/flow'

export default function Properties() {
  const { flow, display } = useFlowState()
  const flowDispatch = useFlowDispatch()
  const uiDispatch = useUIDispatch()
  const { selectedNodeId } = useUIState()

  const updateFlow = useCallback(
    (steps: Step[]) => {
      if (!flow) return
      flowDispatch({ type: 'UPDATE_FLOW', flow: { ...flow, steps } })
    },
    [flow, flowDispatch]
  )

  if (!flow || !selectedNodeId) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Select a node to view properties
        </Typography>
      </Box>
    )
  }

  const step = flow.steps.find((s) => s.id === selectedNodeId)
  if (!step) return null

  const participantIds = flow.participants.map((p) => p.id)
  const stepIds = flow.steps.map((s) => s.id).filter((id) => id !== selectedNodeId)
  const artifactRefs = flow.artifacts.map((a) => a.ref)

  const updateStep = (updates: Partial<Step>) => {
    updateFlow(flow.steps.map((s) => (s.id === selectedNodeId ? { ...s, ...updates } : s)))
  }

  const handleDelete = () => {
    const updatedSteps = flow.steps
      .filter((s) => s.id !== selectedNodeId)
      .map((s) => ({
        ...s,
        dependsOn: (s.dependsOn || []).filter((d) => d !== selectedNodeId),
        steps: (s.steps || []).filter((sub) => sub !== selectedNodeId),
      }))
    const { [selectedNodeId]: _, ...remainingNodes } = display.nodes
    flowDispatch({ type: 'UPDATE_FLOW', flow: { ...flow, steps: updatedSteps } })
    flowDispatch({ type: 'UPDATE_DISPLAY', display: { ...display, nodes: remainingNodes } })
    uiDispatch({ type: 'SELECT_NODE', nodeId: null })
  }

  return (
    <Box sx={{ width: '100%', overflow: 'auto' }}>
      {/* General */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">General</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TextField label="ID" value={step.id} size="small" fullWidth margin="dense" disabled />
          <TextField
            label="Title"
            value={step.title || ''}
            size="small" fullWidth margin="dense"
            onChange={(e) => updateStep({ title: e.target.value })}
          />
          <TextField
            label="Description"
            value={step.description || ''}
            size="small" fullWidth margin="dense" multiline rows={2}
            onChange={(e) => updateStep({ description: e.target.value })}
          />
          <FormControl size="small" fullWidth margin="dense">
            <InputLabel>Type</InputLabel>
            <Select
              value={step.type}
              label="Type"
              onChange={(e) => updateStep({ type: e.target.value as StepType })}
            >
              {(['action', 'fanOut', 'fanIn', 'decision', 'await', 'exit'] as StepType[]).map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </AccordionDetails>
      </Accordion>

      {/* Action: participantRef */}
      {step.type === 'action' && (
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">Participant</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormControl size="small" fullWidth margin="dense">
              <InputLabel>Participant</InputLabel>
              <Select
                value={step.participantRef || ''}
                label="Participant"
                onChange={(e) => updateStep({ participantRef: e.target.value })}
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {participantIds.map((id) => (
                  <MenuItem key={id} value={id}>{id}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Dependencies */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Dependencies</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Autocomplete
            multiple size="small"
            options={stepIds}
            value={step.dependsOn || []}
            onChange={(_, val) => updateStep({ dependsOn: val })}
            renderInput={(params) => <TextField {...params} label="Depends On" margin="dense" />}
            renderTags={(value, getTagProps) =>
              value.map((id, i) => <Chip {...getTagProps({ index: i })} key={id} label={id} size="small" />)
            }
          />
        </AccordionDetails>
      </Accordion>

      {/* Artifacts: consumes / produces */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Artifacts</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Autocomplete
            multiple size="small" freeSolo
            options={artifactRefs}
            value={step.consumes || []}
            onChange={(_, val) => updateStep({ consumes: val })}
            renderInput={(params) => <TextField {...params} label="Consumes" margin="dense" />}
            renderTags={(value, getTagProps) =>
              value.map((ref, i) => <Chip {...getTagProps({ index: i })} key={ref} label={ref} size="small" />)
            }
          />
          <Autocomplete
            multiple size="small" freeSolo
            options={artifactRefs}
            value={step.produces || []}
            onChange={(_, val) => updateStep({ produces: val })}
            renderInput={(params) => <TextField {...params} label="Produces" margin="dense" />}
            renderTags={(value, getTagProps) =>
              value.map((ref, i) => <Chip {...getTagProps({ index: i })} key={ref} label={ref} size="small" color="success" />)
            }
          />
        </AccordionDetails>
      </Accordion>

      {/* FanOut: child steps */}
      {step.type === 'fanOut' && (
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">Fan-Out Steps</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Autocomplete
              multiple size="small"
              options={stepIds}
              value={step.steps || []}
              onChange={(_, val) => updateStep({ steps: val })}
              renderInput={(params) => <TextField {...params} label="Child Steps" margin="dense" />}
              renderTags={(value, getTagProps) =>
                value.map((id, i) => <Chip {...getTagProps({ index: i })} key={id} label={id} size="small" />)
              }
            />
          </AccordionDetails>
        </Accordion>
      )}

      {/* FanIn: condition + operator */}
      {step.type === 'fanIn' && (
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">Fan-In</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormControl size="small" fullWidth margin="dense">
              <InputLabel>Condition</InputLabel>
              <Select
                value={step.condition || 'allSuccess'}
                label="Condition"
                onChange={(e) => updateStep({ condition: e.target.value as Step['condition'] })}
              >
                <MenuItem value="allSuccess">allSuccess</MenuItem>
                <MenuItem value="anySuccess">anySuccess</MenuItem>
                <MenuItem value="allComplete">allComplete</MenuItem>
              </Select>
            </FormControl>
            <OperatorEditor operator={step.operator} onChange={(op) => updateStep({ operator: op })} />
          </AccordionDetails>
        </Accordion>
      )}

      {/* Decision: cases */}
      {step.type === 'decision' && (
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">Decision Cases</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <DecisionEditor
              decision={step.decision}
              stepIds={stepIds}
              onChange={(d) => updateStep({ decision: d })}
            />
          </AccordionDetails>
        </Accordion>
      )}

      {/* Await: awaitInput */}
      {step.type === 'await' && (
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">Await Input</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <AwaitEditor
              awaitInput={step.awaitInput}
              artifactRefs={artifactRefs}
              participantIds={participantIds}
              onChange={(a) => updateStep({ awaitInput: a })}
            />
          </AccordionDetails>
        </Accordion>
      )}

      {/* Exit */}
      {step.type === 'exit' && (
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">Exit</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <ExitEditor exit={step.exit} onChange={(e) => updateStep({ exit: e })} />
          </AccordionDetails>
        </Accordion>
      )}

      {/* Iteration (any type can have it) */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Iteration</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <IterationEditor
            iteration={step.iteration}
            stepIds={stepIds}
            participantIds={participantIds}
            onChange={(it) => updateStep({ iteration: it })}
          />
        </AccordionDetails>
      </Accordion>

      <Divider sx={{ my: 2 }} />
      <Box sx={{ px: 2, pb: 2 }}>
        <Button variant="outlined" color="error" size="small" fullWidth startIcon={<DeleteIcon />} onClick={handleDelete}>
          Delete Step
        </Button>
      </Box>
    </Box>
  )
}


// --- Sub-editors ---

function OperatorEditor({ operator, onChange }: { operator?: Operator; onChange: (op?: Operator) => void }) {
  if (!operator) {
    return (
      <Button size="small" startIcon={<AddIcon />} onClick={() => onChange({ type: 'merge' })}>
        Add Operator
      </Button>
    )
  }
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FormControl size="small" fullWidth margin="dense">
          <InputLabel>Operator Type</InputLabel>
          <Select
            value={operator.type}
            label="Operator Type"
            onChange={(e) => onChange({ ...operator, type: e.target.value as Operator['type'] })}
          >
            {(['summarize', 'rank', 'merge', 'filter', 'await'] as const).map((t) => (
              <MenuItem key={t} value={t}>{t}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <IconButton size="small" onClick={() => onChange(undefined)} title="Remove operator">
          <ClearIcon fontSize="small" />
        </IconButton>
      </Box>
      <TextField
        label="Mode"
        value={operator.mode || ''}
        size="small" fullWidth margin="dense"
        onChange={(e) => onChange({ ...operator, mode: e.target.value || undefined })}
      />
      {operator.type === 'rank' && (
        <TextField
          label="Top N"
          value={operator.topN || ''}
          size="small" fullWidth margin="dense" type="number"
          onChange={(e) => onChange({ ...operator, topN: e.target.value ? Number(e.target.value) : undefined })}
        />
      )}
    </Box>
  )
}

function IterationEditor({
  iteration, stepIds, participantIds, onChange,
}: {
  iteration?: Iteration
  stepIds: string[]
  participantIds: string[]
  onChange: (it?: Iteration) => void
}) {
  if (!iteration) {
    return (
      <Button size="small" startIcon={<AddIcon />} onClick={() => onChange({ mode: 'bounded', maxIterations: 3 })}>
        Add Iteration
      </Button>
    )
  }
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FormControl size="small" fullWidth margin="dense">
          <InputLabel>Mode</InputLabel>
          <Select
            value={iteration.mode}
            label="Mode"
            onChange={(e) => onChange({ ...iteration, mode: e.target.value as Iteration['mode'] })}
          >
            <MenuItem value="forEach">forEach</MenuItem>
            <MenuItem value="while">while</MenuItem>
            <MenuItem value="bounded">bounded</MenuItem>
          </Select>
        </FormControl>
        <IconButton size="small" onClick={() => onChange(undefined)} title="Remove iteration">
          <ClearIcon fontSize="small" />
        </IconButton>
      </Box>
      <TextField
        label="Max Iterations"
        value={iteration.maxIterations ?? ''}
        size="small" fullWidth margin="dense" type="number"
        onChange={(e) => onChange({ ...iteration, maxIterations: e.target.value ? Number(e.target.value) : undefined })}
      />
      <FormControl size="small" fullWidth margin="dense">
        <InputLabel>Strategy</InputLabel>
        <Select
          value={iteration.strategy || ''}
          label="Strategy"
          onChange={(e) => onChange({ ...iteration, strategy: (e.target.value || undefined) as Iteration['strategy'] })}
        >
          <MenuItem value=""><em>None</em></MenuItem>
          <MenuItem value="serial">serial</MenuItem>
          <MenuItem value="parallel">parallel</MenuItem>
        </Select>
      </FormControl>
      <TextField
        label="Timeout"
        value={iteration.timeout || ''}
        size="small" fullWidth margin="dense" placeholder="e.g. PT24H"
        onChange={(e) => onChange({ ...iteration, timeout: e.target.value || undefined })}
      />
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>Scope</Typography>
      <FormControl size="small" fullWidth margin="dense">
        <InputLabel>Scope Type</InputLabel>
        <Select
          value={iteration.scope?.type || ''}
          label="Scope Type"
          onChange={(e) => {
            const t = e.target.value as 'step' | 'subflow' | ''
            onChange({ ...iteration, scope: t ? { type: t, ref: iteration.scope?.ref || '' } : undefined })
          }}
        >
          <MenuItem value=""><em>None</em></MenuItem>
          <MenuItem value="step">step</MenuItem>
          <MenuItem value="subflow">subflow</MenuItem>
        </Select>
      </FormControl>
      {iteration.scope && (
        <FormControl size="small" fullWidth margin="dense">
          <InputLabel>Scope Ref</InputLabel>
          <Select
            value={iteration.scope.ref || ''}
            label="Scope Ref"
            onChange={(e) => onChange({ ...iteration, scope: { ...iteration.scope!, ref: e.target.value } })}
          >
            {(iteration.scope.type === 'step' ? stepIds : participantIds).map((id) => (
              <MenuItem key={id} value={id}>{id}</MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    </Box>
  )
}

function AwaitEditor({
  awaitInput, artifactRefs, participantIds, onChange,
}: {
  awaitInput?: AwaitInput
  artifactRefs: string[]
  participantIds: string[]
  onChange: (a?: AwaitInput) => void
}) {
  if (!awaitInput) {
    return (
      <Button size="small" startIcon={<AddIcon />} onClick={() => onChange({ ref: 'aip://artifact/' })}>
        Add Await Input
      </Button>
    )
  }
  return (
    <Box>
      <Autocomplete
        size="small" freeSolo
        options={artifactRefs}
        value={awaitInput.ref}
        onInputChange={(_, val) => onChange({ ...awaitInput, ref: val })}
        renderInput={(params) => <TextField {...params} label="Artifact Ref" margin="dense" />}
      />
      <TextField
        label="Content Type"
        value={awaitInput.contentType || ''}
        size="small" fullWidth margin="dense"
        onChange={(e) => onChange({ ...awaitInput, contentType: e.target.value || undefined })}
      />
      <FormControl size="small" fullWidth margin="dense">
        <InputLabel>Source Participant</InputLabel>
        <Select
          value={awaitInput.sourceParticipantRef || ''}
          label="Source Participant"
          onChange={(e) => onChange({ ...awaitInput, sourceParticipantRef: e.target.value || undefined })}
        >
          <MenuItem value=""><em>None</em></MenuItem>
          {participantIds.map((id) => <MenuItem key={id} value={id}>{id}</MenuItem>)}
        </Select>
      </FormControl>
      <TextField
        label="Description"
        value={awaitInput.description || ''}
        size="small" fullWidth margin="dense" multiline rows={2}
        onChange={(e) => onChange({ ...awaitInput, description: e.target.value || undefined })}
      />
    </Box>
  )
}

function ExitEditor({ exit, onChange }: { exit?: Exit; onChange: (e?: Exit) => void }) {
  if (!exit) {
    return (
      <Button size="small" startIcon={<AddIcon />} onClick={() => onChange({ status: 'success' })}>
        Add Exit
      </Button>
    )
  }
  return (
    <Box>
      <FormControl size="small" fullWidth margin="dense">
        <InputLabel>Status</InputLabel>
        <Select
          value={exit.status}
          label="Status"
          onChange={(e) => onChange({ ...exit, status: e.target.value as Exit['status'] })}
        >
          {(['success', 'failure', 'cancelled', 'blocked'] as const).map((s) => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        label="Code"
        value={exit.code || ''}
        size="small" fullWidth margin="dense"
        onChange={(e) => onChange({ ...exit, code: e.target.value || undefined })}
      />
      <TextField
        label="Message"
        value={exit.message || ''}
        size="small" fullWidth margin="dense"
        onChange={(e) => onChange({ ...exit, message: e.target.value || undefined })}
      />
    </Box>
  )
}

function DecisionEditor({
  decision, stepIds, onChange,
}: {
  decision?: { cases: DecisionCase[]; default?: { nextStep?: string; nextSteps?: string[] } }
  stepIds: string[]
  onChange: (d: Step['decision']) => void
}) {
  const cases = decision?.cases || []

  const addCase = () => {
    onChange({ ...decision, cases: [...cases, { when: {}, next: { nextStep: '' } }] })
  }

  const updateCase = (index: number, updated: DecisionCase) => {
    const newCases = [...cases]
    newCases[index] = updated
    onChange({ ...decision, cases: newCases })
  }

  const removeCase = (index: number) => {
    onChange({ ...decision, cases: cases.filter((_, i) => i !== index) })
  }

  return (
    <Box>
      {cases.map((c, i) => (
        <Box key={i} sx={{ mb: 1.5, p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" fontWeight={600}>Case {i + 1}</Typography>
            <IconButton size="small" onClick={() => removeCase(i)}><ClearIcon fontSize="small" /></IconButton>
          </Box>
          <TextField
            label="When (JSON)"
            value={JSON.stringify(c.when)}
            size="small" fullWidth margin="dense"
            onChange={(e) => {
              try { updateCase(i, { ...c, when: JSON.parse(e.target.value) }) } catch {}
            }}
          />
          <FormControl size="small" fullWidth margin="dense">
            <InputLabel>Next Step</InputLabel>
            <Select
              value={c.next.nextStep || ''}
              label="Next Step"
              onChange={(e) => updateCase(i, { ...c, next: { nextStep: e.target.value } })}
            >
              {stepIds.map((id) => <MenuItem key={id} value={id}>{id}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>
      ))}
      <Button size="small" startIcon={<AddIcon />} onClick={addCase}>Add Case</Button>

      <Divider sx={{ my: 1 }} />
      <FormControl size="small" fullWidth margin="dense">
        <InputLabel>Default Next Step</InputLabel>
        <Select
          value={decision?.default?.nextStep || ''}
          label="Default Next Step"
          onChange={(e) => onChange({ ...decision, cases, default: e.target.value ? { nextStep: e.target.value } : undefined })}
        >
          <MenuItem value=""><em>None</em></MenuItem>
          {stepIds.map((id) => <MenuItem key={id} value={id}>{id}</MenuItem>)}
        </Select>
      </FormControl>
    </Box>
  )
}
