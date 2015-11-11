'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

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

var AbstractMultiField = (function () {
  function AbstractMultiField(fields, name) {
    _classCallCheck(this, AbstractMultiField);

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
      return _lodash2['default'].inject(path.split('/').filter(function (x) {
        return x != '';
      }), function (o, p) {
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
      var _this2 = this;

      var commands = _kefir2['default'].pool();
      var fields = this.fields;
      var defaultState = _immutable2['default'].Map({
        canSubmit: true,
        hasBeenModified: false,
        isLoading: false
      });

      var mergeChildrenState = function mergeChildrenState(field, state) {
        return function (parentState) {
          var newParentState = parentState.set(field.key, state);
          var subStates = newParentState.filter(function (subState) {
            return _immutable2['default'].Map.isMap(subState) && subState.has('canSubmit');
          }).toList();
          var canSubmit = _lodash2['default'].all(subStates.map(function (x) {
            return x.get('canSubmit');
          }).toJS());
          var isLoading = _lodash2['default'].some(subStates.map(function (x) {
            return x.get('isLoading');
          }).toJS());
          var hasBeenModified = _lodash2['default'].some(subStates.map(function (x) {
            return x.get('hasBeenModified');
          }).toJS());
          return newParentState.merge({
            canSubmit: canSubmit,
            hasBeenModified: hasBeenModified,
            isLoading: isLoading
          });
        };
      };

      _lodash2['default'].each(fields, function (field) {
        commands.plug(field.state.map(function (state) {
          return mergeChildrenState(field, state);
        }));
      });

      if (this.markStream) {
        (function () {
          var markCommand = function markCommand(value) {
            return function (state) {
              return state.set('mark', value);
            };
          };
          commands.plug(_this2.markStream.map(function (v) {
            return markCommand(v);
          }));
        })();
      }

      return commands.scan(function (state, command) {
        return command(state);
      }, defaultState);
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
      return this.parent.path + '/' + this.key;
    }
  }, {
    key: 'root',
    get: function get() {
      if (!this.parent) return this;
      return this.parent.root;
    }
  }]);

  return AbstractMultiField;
})();

var Formo = (function (_AbstractMultiField) {
  _inherits(Formo, _AbstractMultiField);

  function Formo(fields, document) {
    if (fields === undefined) fields = [];

    _classCallCheck(this, Formo);

    _get(Object.getPrototypeOf(Formo.prototype), 'constructor', this).call(this, fields);
    this.propagateParent();
    this.document = document;

    this.markStream = _kefir2['default'].pool();
    this.initState();

    this.submitStream = _kefir2['default'].pool();
    this.submitted = this.state.sampledBy(this.submitStream, function (state, options) {
      return state.set('submitOptions', options);
    });

    this.cancelStream = _kefir2['default'].pool();
    this.cancelled = this.state.sampledBy(this.cancelStream, function (state, options) {
      return state.set('cancelOptions', options);
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
    value: function submit(options) {
      this.submitStream.plug(_kefir2['default'].constant(_immutable2['default'].fromJS(options)));
    }
  }, {
    key: 'cancel',
    value: function cancel(options) {
      this.cancelStream.plug(_kefir2['default'].constant(_immutable2['default'].fromJS(options)));
    }
  }, {
    key: 'mark',
    value: function mark(value) {
      this.markStream.plug(_kefir2['default'].constant(value));
    }
  }, {
    key: 'getDocumentValue',
    value: function getDocumentValue(path) {
      if (!this.document) return;
      return _lodash2['default'].inject(path.split('/').filter(function (x) {
        return x !== '';
      }), function (d, p) {
        return d && d[p];
      }, this.document);
    }
  }, {
    key: 'toDocument',
    value: function toDocument(state) {
      var _this3 = this;

      var res = {};
      state.mapEntries(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 2);

        var name = _ref2[0];
        var subState = _ref2[1];

        if (_immutable2['default'].Map.isMap(subState)) {
          if (subState.has('value')) res[name] = _this3.field(subState.get('path')).castedValue(subState.get('value'));else res[name] = _this3.toDocument(subState);
        }
      });
      return res;
    }
  }]);

  return Formo;
})(AbstractMultiField);

exports.Formo = Formo;

var MultiField = (function (_AbstractMultiField2) {
  _inherits(MultiField, _AbstractMultiField2);

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

    _classCallCheck(this, Field);

    this.schema = schema;
    this.key = name;
  }

  _createClass(Field, [{
    key: 'initState',
    value: function initState() {
      var _this4 = this;

      var defaultValue = this.defaultValue;

      var defaultState = _immutable2['default'].Map({
        value: defaultValue,
        path: this.path,
        error: this.checkError(defaultValue),
        canSubmit: !this.checkError(defaultValue),
        isLoading: 0,
        hasBeenModified: false
      });

      this.newValueStream = _kefir2['default'].pool();
      this.resetStream = _kefir2['default'].pool();

      var commands = _kefir2['default'].pool();

      var checkedValueCommand = function checkedValueCommand(data) {
        return function (state) {
          var isLoading = state.get('isLoading') - 1;
          if (state.get('value') !== data.value) {
            // value has changed before valueChecker end
            return state.merge({
              isLoading: isLoading,
              canSubmit: !(isLoading || data.error),
              hasBeenModified: _this4.hasBeenModified(state.get('value'))
            });
          }
          return state.merge({
            error: data.error,
            isLoading: isLoading,
            canSubmit: !(isLoading || data.error),
            hasBeenModified: _this4.hasBeenModified(state.get('value'))
          });
        };
      };

      var newValueCommand = function newValueCommand(value) {
        return function (state) {
          if (_this4.schema.valueChecker && !(_this4.isNull(value) && _this4.isRequired())) {
            return state.merge({
              value: value,
              canSubmit: false,
              error: undefined,
              hasBeenModified: _this4.hasBeenModified(value)
            });
          }
          if (!_this4.checkValue(value)) {
            return state.merge({
              value: value,
              error: _this4.getError(value),
              hasBeenModified: _this4.hasBeenModified(value),
              canSubmit: false
            });
          }
          return state.merge({
            value: value,
            error: undefined,
            hasBeenModified: _this4.hasBeenModified(value),
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
          }).set('canSubmit', false);
        };
      };

      commands.plug(this.newValueStream.map(function (value) {
        return newValueCommand(value);
      }));
      commands.plug(this.resetStream.map(function (value) {
        return resetCommand();
      }));

      if (this.schema.valueChecker) {
        var stream = this.newValueStream.filter(function (value) {
          return !(_this4.isRequired() && _this4.isNull(value));
        }).debounce(this.schema.valueChecker.debounce || 10).flatMap(function (value) {
          commands.plug(_kefir2['default'].constant(isLoadingCommand()));
          var ajaxRequest = _kefir2['default'].fromPromise(_this4.schema.valueChecker.checker(value));
          return _kefir2['default'].constant(value).combine(ajaxRequest, function (value, res) {
            if (!res.checked) return { error: res.error || 'Wrong Input!', value: value };
            return { value: value, error: undefined };
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
      return this.parent.path + '/' + this.key;
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

  return Field;
})();

exports.Field = Field;
