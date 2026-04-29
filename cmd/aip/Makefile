.PHONY: build install clean tidy

BINARY := aip

build: tidy
	go build -o $(BINARY) .

install: tidy
	go install .

tidy:
	go mod tidy

clean:
	rm -f $(BINARY)
