# punycode-cli

## Installation

```
sudo npm install -g punycode-cli
```

## Usage

```
$ punycode --help
Usage:	/usr/local/bin/punycode [-hD] [-i in_file] [-o out_file]
  -h, --help     display this message
  -D, --decode   decodes input
  -i, --input    input file (default: "-" for stdin)
  -o, --output   output file (default: "-" for stdout)
```

## Examples

UTF-8 domain to ASCII

```
echo -n "😄.example.com" | punycode;
```

ASCII domain to UTF-8

```
echo -n "xn--i28h.example.com" | punycode;
```

## Contributing

**Feel free**
