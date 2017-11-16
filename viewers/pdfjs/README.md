# PDF.js viewer

The PDF.js viewer is built from the [PDF.js](https://github.com/mozilla/pdf.js/) GitHub repository and integrated into `viewers`.

The current version is built from this [tag](https://github.com/mozilla/pdf.js/tree/v1.5.188).

## How to update

For now this is done manually as there is no npm / bower package with the full minified PDF.js viewer.

The integrated version is minified with Google Closure Compiler, see https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions#minified.

* Clone repository

      $ git clone git@github.com:mozilla/pdf.js.git
      $ cd pdf.js

* Checkout the commit / tag wanted.

      $ git checkout v1.5.188

* Update web/viewer.js to empty the `DEFAULT_URL` variable.

* Then build and copy the viewer (here you need `closure-compiler`):

      $ CLOSURE_COMPILER=/usr/local/Cellar/closure-compiler/20160517/libexec/build/compiler.jar node make minified
      $ cp -r build/minified/build build/minified/web /path/to/repo/mostly/viewers/pdfjs/
      $ rm /path/to/repo/mostly-elements/viewers/pdfjs/web/compressed.tracemonkey-pldi-09.pdf
      $ git commit -am "ELEMENTS-XXXXX: update PDF.js version"
