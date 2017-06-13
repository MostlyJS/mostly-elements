MostlyJS Elements
=================

[![Build Status](https://travis-ci.org/mostlyjs/mostly-elements.svg)](https://travis-ci.org/mostlyjs/mostly-elements)

# About mostly-elements

**Mostly Elements** is an ongoing work to develop a set of UI elements for building admin applications with microservices (i.e. micro frontends) using Polymer 1.0 and 2.0.

![Preview](themes/default/preview.jpg)

## Dependencies

Element dependencies are managed via [Bower](http://bower.io/). You can
install that via:

```sh
npm install -g bower
```

Then, go ahead and download the element's dependencies:

```sh
bower install
```

## Reference mostly-elements in your Bower dependencies

```sh
bower install -S mostlyjs/mostly-elements
```
## Quickstart

We recommend that you use [Polymer CLI](https://github.com/Polymer/polymer-cli) which you can install via:

    npm install -g polymer-cli

Then you can run a local web server via:

```sh
polymer serve -p 5000
```

Once running, you can checkout the docs and demos at `http://localhost:5000/demo/`.

### Development workflow

#### Serve / watch

```sh
gulp serve
```

This outputs an IP address you can use to locally test and another that can be used on devices connected to your network.

#### Run tests

```sh
gulp test:local
```

This runs the unit tests defined in the `test` directory through [web-component-tester](https://github.com/Polymer/web-component-tester).

#### Build & Vulcanize

```sh
gulp
```

Build and optimize the current project, ready for deployment. This includes linting as well as vulcanization, image, script, stylesheet and HTML optimization and minification.
