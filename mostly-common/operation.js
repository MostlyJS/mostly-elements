/**
 * The `Operation` class allows to execute an action of a mostly service.
 *
 * **Cannot directly be instantiated**
 *
 * @example
 * client.operation('documents', 'getChild')
 *   .input('/default-domain')
 *   .params({
 *     name: 'workspaces',
 *   })
 *   .execute()
 *   .then(function(res) {
 *     // res.id !== null
 *     // res.title === 'Workspaces'
 *   })
 *   .catch(function(error) {
 *     throw new Error(error);
 *   });
 */

/**
 * Creates an Operation.
 * @param {string} opts - The configuration options.
 * @param {string} opts.nuxeo - The {@link Nuxeo} object linked to this `Operation` object.
 * @param {string} opts.id - The ID of the operation.
 * @param {string} opts.url - The automation URL.
 */
Operation = function(opts = {}) {
  const options = Object.assign({}, opts);
  this._url = options.url;
  this._client = options.client;
  this._method = options.method || 'patch';
  this._action = options.action;
  this._actionParams = {
    params: {},
    context: {},
    input: undefined,
  };
};

/**
 * Sets this operation method.
 * @param {string} method - The param method.
 * @returns {Operation} The operation itself.
 */
Operation.prototype.method = function(value) {
  this._method = value;
  return this;
};

/**
 * Adds an operation param.
 * @param {string} name - The param name.
 * @param {string} value - The param value.
 * @returns {Operation} The operation itself.
 */
Operation.prototype.param = function(name, value) {
  this._actionParams.params[name] = value;
  return this;
};

/**
 * Adds operation params. The given params are merged with the existing ones if any.
 * @param {object} params - The params to be merge with the existing ones.
 * @returns {Operation} The operation itself.
 */
Operation.prototype.params = function(params) {
  this._actionParams.params = Object.assign({}, this._actionParams.params, params);
  return this;
};

/**
 * Sets this operation context.
 * @param {object} context - The operation context.
 * @returns {Operation} The operation itself.
 */
Operation.prototype.context = function(context) {
  this._actionParams.context = context;
  return this;
};

/**
 * Sets this operation input.
 * @param {string|Array|Blob|BatchBlob|BatchUpload} input - The operation input.
 * @returns {Operation} The operation itself.
 */
Operation.prototype.input = function(input) {
  this._actionParams.input = input;
  return this;
};

/**
 * Executes this operation.
 * @param {object} [opts] - Options overriding the ones from this object.
 * @returns {Promise} A Promise object resolved with the result of the Operation.
 */
Operation.prototype.execute = function(opts = {}) {
  let url = this._computeRequestURL();
  let data = this._computeRequestBody();
  let options = {
    method: this._method,
    url: url,
    headers: {
      'Cache-Control': 'no-cache',
      'Content-Type': this._computeContentTypeHeader(this._actionParams.input)
    }
  };
  if (this._method === 'get' || this._method === 'delete') {
    options.params = Object.assign({}, data.params);
  } else {
    options.data = Object.assign({}, data.params, {
      context: data.context,
    });
  }
  options = Object.assign(options, opts);
  return this._client.request(options);
};

Operation.prototype._computeContentTypeHeader = function(input) {
  let contentType = 'application/json';
  if (this._isMultipartInput(input)) {
    contentType = 'multipart/form-data';
  }
  return contentType;
};

Operation.prototype._computeRequestURL = function() {
  const input = this._actionParams.input;
  if (input instanceof BatchBlob) {
    return [this._url, input['batch'] + '.' + input['index'], this._action].join('/');
  } else if (input instanceof BatchUpload) {
    return [this._url, input._batchId, this._action].join('/');
  }

  if (this._action === 'find' && this._method === 'get') {
    return this._url;
  }
  if (this._action === 'create' && this._method === 'post') {
    return this._url;
  }
  if (this._action === 'remove' && this._method === 'delete') {
    return [this._url, input || 'null'].join('/');
  }
  return [this._url, input || 'null', this._action].join('/');
};

Operation.prototype._computeRequestBody = function() {
  const input = this._actionParams.input;
  if (this._isBatchInput(input)) {
    // no input needed
    const body = Object.assign({}, this._actionParams);
    body.input = undefined;
    return body;
  }

  if (input instanceof Array) {
    if (input.length > 0) {
      const first = input[0];
      if (typeof first === 'string') {
        // assume ref list
        this._actionParams.input = `docs:${input.join(',')}`;
        return this._actionParams;
      } else if (first instanceof Blob) {
        // blob list => multipart
        const actionParams = {
          params: this._actionParams.params,
          context: this._actionParams.context,
        };
        const form = new FormData();
        form.append('params', JSON.stringify(actionParams));

        let inputIndex = 0;
        for (const blob of input) {
          form.append(`input#${inputIndex}`, blob.content, blob.name);
          inputIndex += 1;
        }
        return form;
      }
    }
  } else if (this._actionParams.input instanceof Blob) {
    const actionParams = {
      params: this._actionParams.params,
      context: this._actionParams.context,
    };
    const form = new FormData();
    form.append('params', JSON.stringify(actionParams));
    form.append('input', input.content, input.name);
    return form;
  }
  return this._actionParams;
};

Operation.prototype._isMultipartInput = function(input) {
  if (input instanceof Array) {
    if (input.length > 0) {
      const first = input[0];
      if (first instanceof Blob) {
        return true;
      }
    }
  } else if (input instanceof Blob) {
    return true;
  }
  return false;
};

Operation.prototype._isBatchInput = function(input) {
  return input instanceof BatchUpload || input instanceof BatchBlob;
};
