'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _get = function get(_x2, _x3, _x4) { var _again = true; _function: while (_again) { var object = _x2, property = _x3, receiver = _x4; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x2 = parent; _x3 = property; _x4 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _kefir = require('kefir');

var _kefir2 = _interopRequireDefault(_kefir);

var _immutable = require('immutable');

var _immutable2 = _interopRequireDefault(_immutable);

// TODO: remove

var _baconjs = require('baconjs');

var _baconjs2 = _interopRequireDefault(_baconjs);

function storage(constructor) {
  constructor.prototype.setAttrs = function (key, value) {
    if (!this._attrs) this._attrs = {};
    this._attrs[key] = value;
  };

  constructor.prototype.getAttrs = function (key) {
    return this._attrs && this._attrs[key];
  };
}

var AbstractMultiField = (function () {
  function AbstractMultiField(fields, name) {
    _classCallCheck(this, _AbstractMultiField);

    this.key = name;
    this.fields = {};
    this.initFields(fields);
  }

  _createClass(AbstractMultiField, [{
    key: 'reset',
    value: function reset() {
      _lodash2['default'].each(this.fields, function (field) {
        return field.reset();
      });
    }
  }, {
    key: 'hasBeenModified',
    value: function hasBeenModified(state) {
      var _this = this;

      return _lodash2['default'].any(state, function (subState, name) {
        var field = _this.field(name);
        if (field && field.hasBeenModified) return field.hasBeenModified(subState);else return false;
      });
    }
  }, {
    key: 'field',
    value: function field(path) {
      return _lodash2['default'].inject(path.split('.'), function (o, p) {
        return o && o.fields[p];
      }, this);
    }
  }, {
    key: 'initFields',
    value: function initFields(fields) {
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = fields[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var field = _step.value;

          this.fields[field.key] = field;
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator['return']) {
            _iterator['return']();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }
    }
  }, {
    key: 'combineStates',
    value: function combineStates() {
      var fields = this.fields;
      var field = this;
      var res = _lodash2['default'].chain(fields).map(function (value, key) {
        return [key, value.state];
      }).object().value();

      return _baconjs2['default'].combineTemplate(res).map(function (state) {
        var canSubmit = _lodash2['default'].all(_lodash2['default'].map(state, function (subState) {
          return subState.canSubmit;
        }));
        state.canSubmit = canSubmit;
        state.hasBeenModified = field.hasBeenModified(state);
        return state;
      });
    }
  }, {
    key: 'initState',
    value: function initState() {
      _lodash2['default'].each(this.fields, function (field) {
        field.initState();
      });
      this.state = this.combineStates();
    }
  }, {
    key: 'path',
    get: function get() {
      if (!this.parent) return '';
      return this.parent.path + '.' + this.key;
    }
  }, {
    key: 'root',
    get: function get() {
      if (!this.parent) return this;
      return this.parent.root;
    }
  }]);

  var _AbstractMultiField = AbstractMultiField;
  AbstractMultiField = storage(AbstractMultiField) || AbstractMultiField;
  return AbstractMultiField;
})();

var Formo = (function (_AbstractMultiField2) {
  _inherits(Formo, _AbstractMultiField2);

  function Formo(fields, document) {
    _classCallCheck(this, Formo);

    _get(Object.getPrototypeOf(Formo.prototype), 'constructor', this).call(this, fields);
    this.propagateParent();
    this.document = document;
    this.submitBus = new _baconjs2['default'].Bus();
    this.cancelBus = new _baconjs2['default'].Bus();
    this.initState();
    this.submitted = this.state.sampledBy(this.submitBus);
    this.cancelled = this.state.sampledBy(this.cancelBus, function (state, cancelOptions) {
      state.cancelOptions = cancelOptions;
      return state;
    });
  }

  _createClass(Formo, [{
    key: 'propagateParent',
    value: function propagateParent() {
      function propagate(parent) {
        if (!parent.fields) return;
        _lodash2['default'].each(parent.fields, function (field) {
          field.parent = parent;
          propagate(field);
        });
      }
      propagate(this);
    }
  }, {
    key: 'submit',
    value: function submit() {
      this.submitBus.push(true);
    }
  }, {
    key: 'getDocumentValue',
    value: function getDocumentValue(path) {
      if (!this.document) return;
      return _lodash2['default'].inject(path.split('.').filter(function (x) {
        return x !== '';
      }), function (d, p) {
        return d && d[p];
      }, this.document);
    }
  }, {
    key: 'cancel',
    value: function cancel(options) {
      this.cancelBus.push(options);
    }
  }, {
    key: 'toDocument',
    value: function toDocument(state) {
      var _this2 = this;

      var res = {};
      _lodash2['default'].each(state, function (subState, name) {
        if (_lodash2['default'].isObject(subState)) {
          // TODO: use fieldPath to get field
          if ('value' in subState) res[name] = subState.field.castedValue(subState.value);else res[name] = _this2.toDocument(subState);
        }
      });
      return res;
    }
  }]);

  return Formo;
})(AbstractMultiField);

exports.Formo = Formo;

var MultiField = (function (_AbstractMultiField3) {
  _inherits(MultiField, _AbstractMultiField3);

  function MultiField(name, fields) {
    _classCallCheck(this, MultiField);

    _get(Object.getPrototypeOf(MultiField.prototype), 'constructor', this).call(this, fields, name);
  }

  return MultiField;
})(AbstractMultiField);

exports.MultiField = MultiField;

var Field = (function () {
  function Field(name) {
    var schema = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    _classCallCheck(this, _Field);

    this.schema = schema;
    this.key = name;
  }

  _createClass(Field, [{
    key: 'initState',
    value: function initState() {
      var _this3 = this;

      var defaultValue = this.defaultValue;

      var defaultState = _immutable2['default'].Map({
        value: defaultValue,
        error: this.checkError(defaultValue),
        canSubmit: !this.checkError(defaultValue),
        isLoading: 0,
        hasBeenModified: false
      });

      var checkedValueCommand = function checkedValueCommand(data) {
        return function (state) {
          var isLoading = state.get('isLoading') - 1;
          if (state.get('value') !== data.value) {
            // value has changed before valueChecker end
            return state.merge({
              isLoading: isLoading,
              canSubmit: !(isLoading || data.error),
              hasBeenModified: _this3.hasBeenModified(state.get('value'))
            });
          }
          return state.merge({
            error: data.error,
            isLoading: isLoading,
            canSubmit: !(isLoading || data.error),
            hasBeenModified: _this3.hasBeenModified(state.get('value'))
          });
        };
      };

      var newValueCommand = function newValueCommand(value) {
        return function (state) {
          if (_this3.schema.valueChecker) {
            var isLoading = state.get('isLoading');
            return state.merge({
              value: value,
              canSubmit: false,
              hasBeenModified: _this3.hasBeenModified(value)
            });
          }
          if (!_this3.checkValue(value)) {
            return state.merge({
              value: value,
              error: _this3.getError(value),
              hasBeenModified: _this3.hasBeenModified(value),
              canSubmit: false
            });
          }
          return state.merge({
            value: value,
            error: undefined,
            hasBeenModified: _this3.hasBeenModified(value),
            canSubmit: !state.get('isLoading')
          });
        };
      };

      var resetCommand = function resetCommand() {
        return function (state) {
          return defaultState;
        };
      };

      var isLoadingCommand = function isLoadingCommand() {
        return function (state) {
          return state.update('isLoading', function (x) {
            return x + 1;
          });
        };
      };

      this.newValueStream = _kefir2['default'].pool();
      this.resetStream = _kefir2['default'].pool();

      var commands = _kefir2['default'].pool();

      commands.plug(this.newValueStream.map(function (value) {
        return newValueCommand(value);
      }));
      commands.plug(this.resetStream.map(function (value) {
        return resetCommand();
      }));

      if (this.schema.valueChecker) {
        var stream = this.newValueStream.debounce(this.schema.valueChecker.debounce || 10).flatMap(function (value) {
          commands.plug(_kefir2['default'].constant(isLoadingCommand()));
          var ajaxRequest = _kefir2['default'].fromPromise(_this3.schema.valueChecker.checker(value));
          return _kefir2['default'].constant(value).combine(ajaxRequest, function (value, isValid) {
            if (!isValid) return {
              error: _this3.schema.valueChecker.error || 'Wrong Input!',
              value: value
            };
            return { error: undefined, value: value };
          });
        });
        commands.plug(stream.map(function (value) {
          return checkedValueCommand(value);
        }));
      }

      this.state = commands.scan(function (state, command) {
        return command(state);
      }, defaultState);
    }
  }, {
    key: 'castedValue',
    value: function castedValue(value) {
      switch (this.type) {
        case 'number':
        case 'integer':
          return Number(value);
        case 'boolean':
          return Boolean(value);
        default:
          if (value === '') return;
          return value;
      }
    }
  }, {
    key: 'hasBeenModified',
    value: function hasBeenModified(value) {
      return this.castedValue(value) !== this.defaultValue;
    }
  }, {
    key: 'checkValue',
    value: function checkValue(value) {
      if (this.isNull(value)) return !this.isRequired();
      if (this.domainValue) return this.checkDomain(value);
      return this.checkPattern(value);
    }
  }, {
    key: 'checkDomain',
    value: function checkDomain(value) {
      return _lodash2['default'].isFunction(this.domainValue) ? this.domainValue(value) : _lodash2['default'].contains(this.domainValue, value);
    }
  }, {
    key: 'checkError',
    value: function checkError(value) {
      if (!this.checkValue(value)) return this.getError(value);
    }
  }, {
    key: 'checkPattern',
    value: function checkPattern(value) {
      return String(value).match(this.getPattern());
    }
  }, {
    key: 'getError',
    value: function getError(value) {
      if (this.isNull(value) && this.isRequired()) return "Input required";
      if (this.pattern) return "Input doesn't match pattern!";
      if (this.domainValue) return "Input doesn't match domain value!";
      switch (this.type) {
        case 'number':
          return "Input is not a number!";
        case 'integer':
          return "Input is not an integer!";
        case 'boolean':
          return "Input is not an boolean!";
      }
      return "Wrong input!";
    }
  }, {
    key: 'htmlType',
    value: function htmlType() {
      switch (this.type) {
        case 'number':
        case 'integer':
          return 'text';
        case 'color':
          return 'color';
        case 'url':
          return 'url';
        case 'file':
          return 'file';
        default:
          return 'text';
      }
    }
  }, {
    key: 'getPattern',
    value: function getPattern() {
      return this.pattern || ({
        number: /^[0-9]*(\.[0-9]+)?$/,
        integer: /^[0-9]+$/,
        boolean: /true|false/,
        text: /.*/
      })[this.type];
    }
  }, {
    key: 'isNull',
    value: function isNull(value) {
      return _lodash2['default'].isUndefined(value) || value === "";
    }
  }, {
    key: 'setValue',
    value: function setValue(value) {
      this.newValueStream.plug(_kefir2['default'].constant(value));
    }
  }, {
    key: 'reset',
    value: function reset() {
      this.resetStream.plug(_kefir2['default'].constant(true));
    }
  }, {
    key: 'isRequired',
    value: function isRequired() {
      return this.schema.required;
    }
  }, {
    key: 'domainValue',
    get: function get() {
      return this.schema.domainValue;
    }
  }, {
    key: 'defaultValue',
    get: function get() {
      return this.root && this.root.getDocumentValue(this.path) || this.schema.defaultValue;
    }
  }, {
    key: 'label',
    get: function get() {
      return this.schema.label;
    }
  }, {
    key: 'type',
    get: function get() {
      return this.schema.type;
    }
  }, {
    key: 'path',
    get: function get() {
      return this.parent.path + '.' + this.key;
    }
  }, {
    key: 'root',
    get: function get() {
      return this.parent && this.parent.root;
    }
  }, {
    key: 'pattern',
    get: function get() {
      return this.schema.pattern;
    }
  }]);

  var _Field = Field;
  Field = storage(Field) || Field;
  return Field;
})();

exports.Field = Field;
