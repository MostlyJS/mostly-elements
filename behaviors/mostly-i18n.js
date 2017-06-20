window.mostly = window.mostly || {};
window.mostly.I18n = window.mostly.I18n || {};

/**
 * Translates the given key.
 * Also accepts a default value and multiple arguments which will be replaced on the value.
 */
window.mostly.I18n.translate = function (key) {
  var language = window.mostly.I18n.language || 'en';
  var value = (window.mostly.I18n[language] && window.mostly.I18n[language][key]) || key;
  var params = Array.prototype.slice.call(arguments, 1);
  for (var i = 0; i < params.length; i++) {
    value = value.replace('{' + i + '}', params[i]);
  } // improve this to use both numbered and named parameters
  return value;
};

/**
 * loads a locale using a locale resolver
 */
window.mostly.I18n.loadLocale = function() {
  if (window.mostly.I18n.localeResolver) {
    return window.mostly.I18n.localeResolver().then(function() {
      document.dispatchEvent(new Event('i18n-locale-loaded'));
    });
  } else {
    return new Promise(function() {});
  };
};

/**
 * The default locale resolver that reads labels from JSON files in a folder, with format messages.<language>.json
 */
function XHRLocaleResolver(msgFolder) {
  return function() {
    return new Promise(function(resolve) {
      // point all english based locales to the reference file
      if (window.mostly.I18n.language.startsWith('en-')) {
        window.mostly.I18n.language = 'en';
      }
      function loadLang(url) {
        var referenceFile = msgFolder +  '/messages.json';
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            if (xhr.status === 200) {
              window.mostly.I18n[language] = JSON.parse(this.response); // cache this locale
              window.mostly.I18n.language = language;
              // TODO (remove nuxeo i18n)
              window.nuxeo.I18n[language] = JSON.parse(this.response); // cache this locale
              window.nuxeo.I18n.language = language;
              resolve(this.response);
            } else if (xhr.status === 404 && url !== referenceFile) {
              console.log('Could not find locale "' + language + '". Defaulting to "en".');
              language = 'en';
              loadLang(referenceFile); // default to messages.json
            }
          }
        };
        xhr.onerror = function() {
          console.error('Failed to load ' + url);
        };
        xhr.send();
      }
      var language = window.mostly.I18n.language || 'en';
      var url = msgFolder +  '/messages' + (language === 'en' ? '' : '-' + language)  + '.json';
      loadLang(url);
    });
  }
}
