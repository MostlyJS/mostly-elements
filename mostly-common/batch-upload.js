/**
 * The **BatchUpload** class allows to upload {@link Blob} objets to
 * a playing-blobs service using the batch upload API.
 *
 * It creates and maintains a batch id from playing-blobs service.
 *
 * @example
 * var batch = client.batchUpload('blobs');
 * var blob = new Blob(...);
 * batch.upload(blob)
 *   .then(function(res) {
 *     // res.blob instanceof BatchBlob === true
 *   })
 *   .catch(function(error) {
 *     throw new Error(error);
 *   });
 */
const DEFAULT_OPTS = {
  concurrency: 5,
};

/**
 * Creates a BatchUpload.
 * @param {object} opts - The configuration options.
 * @param {string} opts.client - The {@link Axios} object linked to this BatchUpload object.
 * @param {Number} [opts.concurrency=5] - Number of concurrent uploads.
 */
BatchUpload = function(opts = {}) {
  const options = Object.assign({}, DEFAULT_OPTS, opts);
  this._url = options.url;
  this._client = options.client;
  this._uploadIndex = 0;
  this._queue = new Queue(options.concurrency, Infinity);
  this._batchIdPromise = null;
  this._batchId = null;
  this._promises = [];
};

/**
 * Upload one or more blobs.
 * @param {...Blob} blobs - Blobs to be uploaded.
 * @returns {Promise} A Promise object resolved when all blobs are uploaded.
 *
 * @example
 * ...
 * batchUpload.upload(blob1, blob2, blob3)
 *   .then(function(res) {
 *     // res.data.data[0] is the BatchBlob object related to blob1
 *     // res.data.data[1] is the BatchBlob object related to blob2
 *     // res.data.data[2] is the BatchBlob object related to blob3
 *   })
 *   .catch(function(error) {
 *     throw new Error(error);
 *   });
 */
BatchUpload.prototype.upload = function(...blobs) {
  const promises = blobs.map(blob => {
    const promise = this._queue.add(this._upload.bind(this, blob));
    this._promises.push(promise);
    return promise;
  });
  if (promises.length === 1) {
    return promises[0];
  }

  return Promise.all(promises).then(batchBlobs => {
    return {
      blobs: batchBlobs.map((batchBlob) => batchBlob.blob),
      batch: this,
    };
  });
}

BatchUpload.prototype._upload = function(blob) {
  if (!this._batchIdPromise) {
    this._batchIdPromise = this._fetchBatchId();
  }

  const uploadIndex = this._uploadIndex;
  this._uploadIndex += 1;
  return this._batchIdPromise.then(() => {
    const form = new FormData();
    form.append('file', blob.content);
    form.append('index', uploadIndex);
    form.append('vender', 'file');
    
    const options = {
      method: 'put',
      url: this._url + '/' + this._batchId,
      data: form,
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'multipart/form-data'
      },
    };
    return this._client.request(options);
  }).then(res => {
    let blob = res.data.data;
    blob.batchId = this._batchId;
    blob.index = uploadIndex;
    return {
      blob: blob,
      batch: this,
    };
  });
};

BatchUpload.prototype._fetchBatchId = function() {
  const options = {
    method: 'post',
    url: this._url,
  };

  if (this._batchId) {
    return Promise.resolve(this);
  }
  return this._client.request(options).then(res => {
    if (res.data && res.data.data) {
      this._batchId = res.data.data.id;
    } else {
      throw 'Batch not created';
    }
    return this;
  });
};

/**
 * Wait for all the current uploads to be finished. Note that it won't wait for uploads added after done() being call.
 * If an uploaded is added, you should call again done().
 * The {@link BatchUpload#isFinished} method can be used to know if the batch is finished.
 * @returns {Promise} A Promise object resolved when all the current uploads are finished.
 *
 * @example
 * ...
 * nuxeoBatch.upload(blob1, blob2, blob3);
 * nuxeoBatch.done()
 *   .then(function(res) {
 *     // res.data.batch === batchId
 *     // res.blobs[0] is the BatchBlob object related to blob1
 *     // res.blobs[1] is the BatchBlob object related to blob2
 *     // res.blobs[2] is the BatchBlob object related to blob3
 *   })
 *   .catch(function(error) {
 *     throw new Error(error);
 *   });
 */
BatchUpload.prototype.done = function() {
  return Promise.all(this._promises).then(batchBlobs => {
    return {
      blobs: batchBlobs.map((batchBlob) => batchBlob.blob),
      batch: this,
    };
  });
};

/**
 * Returns whether the BatchUpload is finished, ie. has uploads running, or not.
 * @returns {Boolean} true if the BatchUpload is finished, false otherwise.
 */
BatchUpload.prototype.isFinished = function() {
  return this._queue.getQueueLength() === 0 && this._queue.getPendingLength() === 0;
};

/**
 * Cancels a BatchUpload.
 * @returns {Promise} A Promise object resolved with the BatchUpload itself.
 */
BatchUpload.prototype.cancel = function(opts) {
  if (!this._batchIdPromise) {
    return Promise.resolve(this);
  }

  const url = this._url + '/' + this._batchId;
  return this._batchIdPromise.then(() => {
    return this._client.delete(url);
  }).then(() => {
    this._batchIdPromise = null;
    this._batchId = null;
    return this;
  });
};

/**
 * Fetches a blob at a given index from the batch.
 * @returns {Promise} A Promise object resolved with the BatchUpload itself and the BatchBlob.
 */
BatchUpload.prototype.fetchBlob = function(index, opts = {}) {
  if (!this._batchId) {
    return Promise.reject(new Error('No \'batchId\' set'));
  }

  let options = {
    method: 'get',
    url: this._url + '/' + this._batchId + '?index=' + index,
  };
  options = Object.assign(options, opts);
  return this._client.request(options).then(res => {
    let blob = res.data.data;
    blob.batchId = this._batchId;
    blob.index = index;
    return {
      batch: this,
      blob: blob,
    };
  });
};

/**
 * Removes a blob at a given index from the batch.
 * @returns {Promise} A Promise object resolved with the result of the DELETE request.
 */
BatchUpload.prototype.removeBlob = function(index, opts = {}) {
  if (!this._batchId) {
    return Promise.reject(new Error('No \'batchId\' set'));
  }

  let options = {
    method: 'delete',
    url: this._url + '/' + this._batchId + '?index=' + index,
  };
  options = Object.assign(options, opts);
  return this._client.request(options);
};

/**
 * Fetches the blobs from the batch.
 * @returns {Promise} A Promise object resolved with the BatchUpload itself and the BatchBlobs.
 */
BatchUpload.prototype.fetchBlobs = function(opts = {}) {
  if (!this._batchId) {
    return Promise.reject(new Error('No \'batchId\' set'));
  }

  let options = {
    method: 'get',
    url: this._url + '/' + this._batchId,
  };
  options = Object.assign(options, opts);
  return this._client.request(options).then(res => {
    let blobs = res.data.data;
    const batchBlobs = blobs.map((blob, index) => {
      blob.batchId = this._batchId;
      blob.index = index;
      return blob;
    });
    return {
      batch: this,
      blobs: batchBlobs,
    };
  });
};