'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _bintrees = require('bintrees');

var _bintrees2 = _interopRequireDefault(_bintrees);

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var temporalstate = function (_event_emitter) {
    _inherits(temporalstate, _event_emitter);

    function temporalstate() {
        _classCallCheck(this, temporalstate);

        var _this = _possibleConstructorReturn(this, (temporalstate.__proto__ || Object.getPrototypeOf(temporalstate)).call(this));

        _this._states = {};
        _this._txn = [];

        return _this;
    }

    _createClass(temporalstate, [{
        key: 'change_list',
        value: function change_list() {

            var changes = [];
            var states = this._states;

            var val_iter_grp = Object.keys(states).filter(function (sn) {
                return states[sn].size > 0;
            }).map(function (sn) {
                return states[sn].iterator();
            }).map(function (i) {
                return [i.next(), i];
            }).sort(function (a, b) {
                return temporalstate.change_cmp(a[0], b[0]);
            });
            while (val_iter_grp.length > 0) {
                var v = val_iter_grp[0][0];
                var i = val_iter_grp[0][1];
                changes.push(v);
                val_iter_grp[0] = [i.next(), i];
                val_iter_grp = val_iter_grp.filter(function (a) {
                    return a[0] !== null;
                }).sort(function (a, b) {
                    return temporalstate.change_cmp(a[0], b[0]);
                });
            }

            return changes;
        }
    }, {
        key: 'txn',
        value: function txn(id, descr, fun) {

            var txn_stack = this._txn;

            txn_stack.push({
                'id': id,
                'descr': descr
            });

            this.emit('txn_start', id, descr, txn_stack);
            fun();
            this.emit('txn_end', id, descr, txn_stack);

            txn_stack.pop();
        }
    }, {
        key: 'add_change',
        value: function add_change(change) {

            var states = this._states;

            var st_name = change.name;
            var st_val = change.val;
            var ts = change.timestamp;

            if (states[st_name] === undefined) this._priv_add_state(st_name);

            var state = states[st_name];
            var iter = state.upperBound(change);
            var next = iter.data();
            var cur = iter.prev();

            var txn_descr = [];
            var txn_funs = [];

            if (cur === null) {
                if (st_val !== null) {
                    txn_descr.push({ 'add': { 'timestamp': ts, 'name': st_name, 'val': st_val } });
                    txn_funs.push(this._priv_change_add.bind(this, { 'timestamp': ts, 'name': st_name, 'val': st_val }));
                    if (next !== null && next.val === st_val) {
                        txn_descr.push({ 'rm': next });
                        txn_funs.push(this._priv_change_remove.bind(this, next));
                    }
                }
            } else if (cur.timestamp === ts) {
                if (cur.val !== st_val) {
                    var prev = iter.prev();
                    if (prev === null) {
                        if (st_val === null) {
                            txn_descr.push({ 'remove': cur });
                            txn_funs.push(this._priv_change_remove.bind(this, cur));
                        } else {
                            txn_descr.push({ 'change': cur, 'new_val': st_val });
                            txn_funs.push(this._priv_change_change.bind(this, cur, st_val));
                        }
                        if (next !== null && next.val === st_val) {
                            txn_descr.push({ 'remove': next });
                            txn_funs.push(this._priv_change_remove.bind(this, next));
                        }
                    } else if (prev.val === st_val) {
                        txn_descr.push({ 'remove': cur });
                        txn_funs.push(this._priv_change_remove.bind(this, cur));
                        if (next !== null && next.val === st_val) {
                            txn_descr.push({ 'remove': next });
                            txn_funs.push(this._priv_change_remove.bind(this, next));
                        }
                    } else {
                        txn_descr.push({ 'change': cur, 'new_val': st_val });
                        txn_funs.push(this._priv_change_change.bind(this, cur, st_val));
                    }
                }
            } else if (cur.val !== st_val) {
                txn_descr.push({ 'add': { 'timestamp': ts, 'name': st_name, 'val': st_val } });
                txn_funs.push(this._priv_change_add.bind(this, { 'timestamp': ts, 'name': st_name, 'val': st_val }));
                if (next !== null && next.val === st_val) {
                    txn_descr.push({ 'rm': next });
                    txn_funs.push(this._priv_change_remove.bind(this, next));
                }
            }

            this.txn({ 'add': { 'timestamp': ts, 'name': st_name, 'val': st_val } }, txn_descr, function () {
                txn_funs.forEach(function (f) {
                    return f();
                });
            });
        }
    }, {
        key: 'remove_change',
        value: function remove_change(change) {

            var states = this._states;
            var state = states[change.name];

            if (state === undefined) return;

            var v = state.find(change);
            if (v !== null && v.val !== change.val) return;

            this.emit('txn_start', { 'remove': change }, [{ 'remove': change }]);
            this._priv_change_remove(change);
            this.emit('txn_end', { 'remove': change }, [{ 'remove': change }]);
        }
    }, {
        key: 'var_list',
        value: function var_list() {

            return Object.keys(this._states).sort();
        }
    }, {
        key: 'first',
        value: function first() {

            var states = this._states;

            var first_val_changes = Object.keys(states).filter(function (sn) {
                return states[sn].size > 0;
            }).map(function (sn) {
                return states[sn].iterator();
            }).map(function (i) {
                return i.next();
            }).sort(temporalstate.change_cmp);
            if (first_val_changes.length === 0) return null;
            var earliest_timestamp = first_val_changes[0].timestamp;
            return first_val_changes.filter(function (change) {
                return change.timestamp === earliest_timestamp;
            });
        }
    }, {
        key: 'last',
        value: function last() {

            var states = this._states;

            var last_val_changes = Object.keys(states).filter(function (sn) {
                return states[sn].size > 0;
            }).map(function (sn) {
                return states[sn].iterator();
            }).map(function (i) {
                return i.prev();
            }).sort(temporalstate.change_cmp);
            if (last_val_changes.length === 0) return null;
            var oldest_timestamp = last_val_changes[last_val_changes.length - 1].timestamp;
            return last_val_changes.filter(function (change) {
                return change.timestamp === oldest_timestamp;
            });
        }
    }, {
        key: 'next',
        value: function next(current, st_name) {

            var states = this._states;

            if (st_name !== undefined) {
                var state = states[st_name];
                if (state === undefined || state.size === 0) return null;
                return state.upperBound(current).data();
            }

            var next_val_changes = Object.keys(states).filter(function (sn) {
                return states[sn].size > 0;
            }).map(function (sn) {
                return states[sn].upperBound(current);
            }).map(function (i) {
                while (i.data() !== null && i.data().timestamp === current.timestamp) {
                    i.next();
                }return i.data();
            }).filter(function (change) {
                return change !== null;
            }).sort(temporalstate.change_cmp);
            if (next_val_changes.length === 0) return null;
            var next_timestamp = next_val_changes[0].timestamp;
            return next_val_changes.filter(function (change) {
                return change.timestamp === next_timestamp;
            });
        }
    }, {
        key: 'prev',
        value: function prev(current, st_name) {

            var states = this._states;

            if (st_name !== undefined) {
                var state = states[st_name];
                if (state === undefined || state.size === 0) return null;
                var iter = state.lowerBound(current);
                return iter.prev();
            }

            var prev_val_changes = Object.keys(states).filter(function (sn) {
                return states[sn].size > 0;
            }).map(function (sn) {
                return states[sn].lowerBound(current);
            }).map(function (i) {
                do {
                    i.prev();
                } while (i.data() !== null && i.data().timestamp === current.timestamp);
                return i.data();
            }).filter(function (change) {
                return change !== null;
            }).sort(temporalstate.change_cmp);
            if (prev_val_changes.length === 0) return null;
            var prev_timestamp = prev_val_changes[prev_val_changes.length - 1].timestamp;
            return prev_val_changes.filter(function (change) {
                return change.timestamp === prev_timestamp;
            });
        }
    }, {
        key: 'at',
        value: function at(timestamp) {

            var states = this._states;

            return Object.keys(states).filter(function (sn) {
                return states[sn].size > 0;
            }).map(function (sn) {
                return states[sn].find({ 'timestamp': timestamp });
            }).filter(function (v) {
                return v !== null;
            }).sort(temporalstate.change_cmp);
        }
    }, {
        key: 'after',
        value: function after(timestamp) {

            return this.next({ 'timestamp': timestamp });
        }
    }, {
        key: 'before',
        value: function before(timestamp) {

            return this.prev({ 'timestamp': timestamp });
        }
    }, {
        key: 'state',
        value: function state(ts, st_name) {
            var _this2 = this;

            var states = this._states;

            if (st_name !== undefined) {
                var state = states[st_name];
                if (state === undefined) return null;
                var iter = state.upperBound({ timestamp: ts });
                var rec = iter.prev();
                return rec === null ? null : rec.val;
            }

            return Object.keys(states).filter(function (sn) {
                return states[sn].size > 0;
            }).reduce(function (acc, sn) {
                var rec = _this2.state(ts, sn);
                if (rec !== null) acc[sn] = rec;
                return acc;
            }, {});
        }
    }, {
        key: 'state_detail',
        value: function state_detail(ts, st_name) {

            var states = this._states;

            if (st_name !== undefined) {
                var state = states[st_name];
                if (state === undefined) return { 'from': null, 'to': null };
                var iter = state.upperBound({ timestamp: ts });
                var next_rec = iter.data();
                var cur_rec = iter.prev();
                if (cur_rec === null && next_rec === null) return null;
                return {
                    'from': cur_rec,
                    'to': next_rec
                };
            }

            return Object.keys(states).sort().reduce(function (acc, sn) {
                var state = states[sn];
                var iter = state.upperBound({ timestamp: ts });
                var next_rec = iter.data();
                var cur_rec = iter.prev();
                if (cur_rec !== null || next_rec !== null) acc.push({
                    'from': cur_rec,
                    'to': next_rec
                });
                return acc;
            }, []);
        }
    }, {
        key: 'between',
        value: function between(from_ts, to_ts, greedy, st_name) {

            var states = this._states;

            if (greedy === undefined) greedy = false;

            var st_names = st_name === undefined ? this.var_list() : [st_name];

            var changes = [];
            for (var i = 0; i < st_names.length; i++) {
                var state = states[st_names[i]];
                var iter = state.upperBound({ timestamp: from_ts });
                var cur_rec = iter.prev();
                if (cur_rec !== null && (greedy || cur_rec.timestamp === from_ts)) changes.push(cur_rec);
                while ((cur_rec = iter.next()) && cur_rec.timestamp <= to_ts) {
                    changes.push(cur_rec);
                }
            }

            return changes.sort(temporalstate.change_cmp);
        }
    }, {
        key: 'remove_var',
        value: function remove_var(var_name) {

            var states = this._states;
            var state = states[var_name];

            if (state && state.size === 0) {
                delete states[var_name];
                return true;
            }

            return false;
        }
    }, {
        key: '_priv_add_state',
        value: function _priv_add_state(st_name) {

            this.emit('new_var', st_name);
            this._states[st_name] = new _bintrees2.default.RBTree(temporalstate.change_cmp);
        }
    }, {
        key: '_priv_change_add',
        value: function _priv_change_add(change) {

            this.emit('add', { 'timestamp': change.timestamp, 'name': change.name, 'val': change.val });
            this._states[change.name].insert(change);
        }
    }, {
        key: '_priv_change_remove',
        value: function _priv_change_remove(change) {

            this.emit('rm', { 'timestamp': change.timestamp, 'name': change.name, 'val': change.val });
            this._states[change.name].remove(change);
        }
    }, {
        key: '_priv_change_change',
        value: function _priv_change_change(change, new_val) {

            var old_val = change.val;

            this.emit('change', { 'timestamp': change.timestamp, 'name': change.name, 'val': old_val }, new_val);
            change.val = new_val;
        }
    }], [{
        key: 'change_cmp',
        value: function change_cmp(a, b) {

            return a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
        }
    }]);

    return temporalstate;
}(_events2.default);

exports.default = temporalstate;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpYi90ZW1wb3JhbHN0YXRlLmpzIl0sIm5hbWVzIjpbInRlbXBvcmFsc3RhdGUiLCJfc3RhdGVzIiwiX3R4biIsImNoYW5nZXMiLCJzdGF0ZXMiLCJ2YWxfaXRlcl9ncnAiLCJPYmplY3QiLCJrZXlzIiwiZmlsdGVyIiwic24iLCJzaXplIiwibWFwIiwiaXRlcmF0b3IiLCJpIiwibmV4dCIsInNvcnQiLCJhIiwiYiIsImNoYW5nZV9jbXAiLCJsZW5ndGgiLCJ2IiwicHVzaCIsImlkIiwiZGVzY3IiLCJmdW4iLCJ0eG5fc3RhY2siLCJlbWl0IiwicG9wIiwiY2hhbmdlIiwic3RfbmFtZSIsIm5hbWUiLCJzdF92YWwiLCJ2YWwiLCJ0cyIsInRpbWVzdGFtcCIsInVuZGVmaW5lZCIsIl9wcml2X2FkZF9zdGF0ZSIsInN0YXRlIiwiaXRlciIsInVwcGVyQm91bmQiLCJkYXRhIiwiY3VyIiwicHJldiIsInR4bl9kZXNjciIsInR4bl9mdW5zIiwiX3ByaXZfY2hhbmdlX2FkZCIsImJpbmQiLCJfcHJpdl9jaGFuZ2VfcmVtb3ZlIiwiX3ByaXZfY2hhbmdlX2NoYW5nZSIsInR4biIsImZvckVhY2giLCJmIiwiZmluZCIsImZpcnN0X3ZhbF9jaGFuZ2VzIiwiZWFybGllc3RfdGltZXN0YW1wIiwibGFzdF92YWxfY2hhbmdlcyIsIm9sZGVzdF90aW1lc3RhbXAiLCJjdXJyZW50IiwibmV4dF92YWxfY2hhbmdlcyIsIm5leHRfdGltZXN0YW1wIiwibG93ZXJCb3VuZCIsInByZXZfdmFsX2NoYW5nZXMiLCJwcmV2X3RpbWVzdGFtcCIsInJlYyIsInJlZHVjZSIsImFjYyIsIm5leHRfcmVjIiwiY3VyX3JlYyIsImZyb21fdHMiLCJ0b190cyIsImdyZWVkeSIsInN0X25hbWVzIiwidmFyX2xpc3QiLCJ2YXJfbmFtZSIsIlJCVHJlZSIsImluc2VydCIsInJlbW92ZSIsIm5ld192YWwiLCJvbGRfdmFsIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBOzs7O0FBQ0E7Ozs7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R0FDQWQsRUFBRWMsSUFBRixHQUFTYixFQUFFYSxJQUFYLEdBQWtCLENBQWxCLEdBQ0EsQ0FKTjtBQU1IOzs7Ozs7a0JBS1U5QixhIiwiZmlsZSI6InRlbXBvcmFsc3RhdGVfZXM1LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGJpbnRyZWVzIGZyb20gJ2JpbnRyZWVzJztcbmltcG9ydCBldmVudF9lbWl0dGVyIGZyb20gJ2V2ZW50cyc7XG5cblxuY2xhc3MgdGVtcG9yYWxzdGF0ZSBleHRlbmRzIGV2ZW50X2VtaXR0ZXIge1xuXG4gICAgY29uc3RydWN0b3IgKCkge1xuXG4gICAgICAgIHN1cGVyKCk7XG5cbiAgICAgICAgdGhpcy5fc3RhdGVzID0ge307XG4gICAgICAgIHRoaXMuX3R4biAgICA9IFtdO1xuXG4gICAgfVxuXG4gICAgY2hhbmdlX2xpc3QgKCkge1xuXG4gICAgICAgIGxldCBjaGFuZ2VzID0gW107XG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgbGV0IHZhbF9pdGVyX2dycCA9IE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5maWx0ZXIoKHNuKSA9PiBzdGF0ZXNbc25dLnNpemUgPiAwKVxuICAgICAgICAgICAgLm1hcCgoc24pID0+IHN0YXRlc1tzbl0uaXRlcmF0b3IoKSlcbiAgICAgICAgICAgIC5tYXAoKGkpID0+IFtpLm5leHQoKSwgaV0pXG4gICAgICAgICAgICAuc29ydCgoYSwgYikgPT4gdGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKGFbMF0sIGJbMF0pKTtcbiAgICAgICAgd2hpbGUgKHZhbF9pdGVyX2dycC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBsZXQgdiA9IHZhbF9pdGVyX2dycFswXVswXTtcbiAgICAgICAgICAgIGxldCBpID0gdmFsX2l0ZXJfZ3JwWzBdWzFdO1xuICAgICAgICAgICAgY2hhbmdlcy5wdXNoKHYpO1xuICAgICAgICAgICAgdmFsX2l0ZXJfZ3JwWzBdID0gW2kubmV4dCgpLCBpXTtcbiAgICAgICAgICAgIHZhbF9pdGVyX2dycCA9IHZhbF9pdGVyX2dycFxuICAgICAgICAgICAgICAgIC5maWx0ZXIoKGEpID0+IGFbMF0gIT09IG51bGwpXG4gICAgICAgICAgICAgICAgLnNvcnQoKGEsIGIpID0+IHRlbXBvcmFsc3RhdGUuY2hhbmdlX2NtcChhWzBdLCBiWzBdKSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY2hhbmdlcztcblxuICAgIH1cblxuICAgIHR4biAoaWQsIGRlc2NyLCBmdW4pIHtcblxuICAgICAgICBsZXQgdHhuX3N0YWNrID0gdGhpcy5fdHhuO1xuXG4gICAgICAgIHR4bl9zdGFjay5wdXNoKHtcbiAgICAgICAgICAgICdpZCc6ICAgIGlkLFxuICAgICAgICAgICAgJ2Rlc2NyJzogZGVzY3IsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuZW1pdCgndHhuX3N0YXJ0JywgaWQsIGRlc2NyLCB0eG5fc3RhY2spO1xuICAgICAgICBmdW4oKTtcbiAgICAgICAgdGhpcy5lbWl0KCd0eG5fZW5kJywgaWQsIGRlc2NyLCB0eG5fc3RhY2spO1xuXG4gICAgICAgIHR4bl9zdGFjay5wb3AoKTtcblxuICAgIH1cblxuICAgIGFkZF9jaGFuZ2UgKGNoYW5nZSkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgbGV0IHN0X25hbWUgPSBjaGFuZ2UubmFtZTtcbiAgICAgICAgbGV0IHN0X3ZhbCAgPSBjaGFuZ2UudmFsO1xuICAgICAgICBsZXQgdHMgICAgICA9IGNoYW5nZS50aW1lc3RhbXA7XG5cbiAgICAgICAgaWYgKHN0YXRlc1tzdF9uYW1lXSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgdGhpcy5fcHJpdl9hZGRfc3RhdGUoc3RfbmFtZSk7XG5cbiAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW3N0X25hbWVdO1xuICAgICAgICBsZXQgaXRlciA9IHN0YXRlLnVwcGVyQm91bmQoY2hhbmdlKTtcbiAgICAgICAgbGV0IG5leHQgPSBpdGVyLmRhdGEoKTtcbiAgICAgICAgbGV0IGN1ciA9IGl0ZXIucHJldigpO1xuXG4gICAgICAgIGxldCB0eG5fZGVzY3IgPSBbXTtcbiAgICAgICAgbGV0IHR4bl9mdW5zID0gW107XG5cbiAgICAgICAgaWYgKGN1ciA9PT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKHN0X3ZhbCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHR4bl9kZXNjci5wdXNoKHsnYWRkJzogeyd0aW1lc3RhbXAnOiB0cywgJ25hbWUnOiBzdF9uYW1lLCAndmFsJzogc3RfdmFsfX0pO1xuICAgICAgICAgICAgICAgIHR4bl9mdW5zLnB1c2godGhpcy5fcHJpdl9jaGFuZ2VfYWRkLmJpbmQodGhpcywgeyd0aW1lc3RhbXAnOiB0cywgJ25hbWUnOiBzdF9uYW1lLCAndmFsJzogc3RfdmFsfSkpO1xuICAgICAgICAgICAgICAgIGlmIChuZXh0ICE9PSBudWxsICYmIG5leHQudmFsID09PSBzdF92YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgdHhuX2Rlc2NyLnB1c2goeydybSc6IG5leHR9KTtcbiAgICAgICAgICAgICAgICAgICAgdHhuX2Z1bnMucHVzaCh0aGlzLl9wcml2X2NoYW5nZV9yZW1vdmUuYmluZCh0aGlzLCBuZXh0KSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGN1ci50aW1lc3RhbXAgPT09IHRzKSB7XG4gICAgICAgICAgICBpZiAoY3VyLnZhbCAhPT0gc3RfdmFsKSB7XG4gICAgICAgICAgICAgICAgbGV0IHByZXYgPSBpdGVyLnByZXYoKTtcbiAgICAgICAgICAgICAgICBpZiAocHJldiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RfdmFsID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eG5fZGVzY3IucHVzaCh7J3JlbW92ZSc6IGN1cn0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdHhuX2Z1bnMucHVzaCh0aGlzLl9wcml2X2NoYW5nZV9yZW1vdmUuYmluZCh0aGlzLCBjdXIpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR4bl9kZXNjci5wdXNoKHsnY2hhbmdlJzogY3VyLCAnbmV3X3ZhbCc6IHN0X3ZhbH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdHhuX2Z1bnMucHVzaCh0aGlzLl9wcml2X2NoYW5nZV9jaGFuZ2UuYmluZCh0aGlzLCBjdXIsIHN0X3ZhbCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChuZXh0ICE9PSBudWxsICYmIG5leHQudmFsID09PSBzdF92YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR4bl9kZXNjci5wdXNoKHsncmVtb3ZlJzogbmV4dH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdHhuX2Z1bnMucHVzaCh0aGlzLl9wcml2X2NoYW5nZV9yZW1vdmUuYmluZCh0aGlzLCBuZXh0KSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByZXYudmFsID09PSBzdF92YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgdHhuX2Rlc2NyLnB1c2goeydyZW1vdmUnOiBjdXJ9KTtcbiAgICAgICAgICAgICAgICAgICAgdHhuX2Z1bnMucHVzaCh0aGlzLl9wcml2X2NoYW5nZV9yZW1vdmUuYmluZCh0aGlzLCBjdXIpKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5leHQgIT09IG51bGwgJiYgbmV4dC52YWwgPT09IHN0X3ZhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHhuX2Rlc2NyLnB1c2goeydyZW1vdmUnOiBuZXh0fSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eG5fZnVucy5wdXNoKHRoaXMuX3ByaXZfY2hhbmdlX3JlbW92ZS5iaW5kKHRoaXMsIG5leHQpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHR4bl9kZXNjci5wdXNoKHsnY2hhbmdlJzogY3VyLCAnbmV3X3ZhbCc6IHN0X3ZhbH0pO1xuICAgICAgICAgICAgICAgICAgICB0eG5fZnVucy5wdXNoKHRoaXMuX3ByaXZfY2hhbmdlX2NoYW5nZS5iaW5kKHRoaXMsIGN1ciwgc3RfdmFsKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGN1ci52YWwgIT09IHN0X3ZhbCkge1xuICAgICAgICAgICAgdHhuX2Rlc2NyLnB1c2goeydhZGQnOiB7J3RpbWVzdGFtcCc6IHRzLCAnbmFtZSc6IHN0X25hbWUsICd2YWwnOiBzdF92YWx9fSk7XG4gICAgICAgICAgICB0eG5fZnVucy5wdXNoKHRoaXMuX3ByaXZfY2hhbmdlX2FkZC5iaW5kKHRoaXMsIHsndGltZXN0YW1wJzogdHMsICduYW1lJzogc3RfbmFtZSwgJ3ZhbCc6IHN0X3ZhbH0pKTtcbiAgICAgICAgICAgIGlmIChuZXh0ICE9PSBudWxsICYmIG5leHQudmFsID09PSBzdF92YWwpIHtcbiAgICAgICAgICAgICAgICB0eG5fZGVzY3IucHVzaCh7J3JtJzogbmV4dH0pO1xuICAgICAgICAgICAgICAgIHR4bl9mdW5zLnB1c2godGhpcy5fcHJpdl9jaGFuZ2VfcmVtb3ZlLmJpbmQodGhpcywgbmV4dCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy50eG4oXG4gICAgICAgICAgICB7J2FkZCc6IHsndGltZXN0YW1wJzogdHMsICduYW1lJzogc3RfbmFtZSwgJ3ZhbCc6IHN0X3ZhbH19LFxuICAgICAgICAgICAgdHhuX2Rlc2NyLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCkgeyB0eG5fZnVucy5mb3JFYWNoKChmKSA9PiBmKCkpOyB9XG4gICAgICAgICk7XG5cbiAgICB9XG5cbiAgICByZW1vdmVfY2hhbmdlIChjaGFuZ2UpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbY2hhbmdlLm5hbWVdO1xuXG4gICAgICAgIGlmIChzdGF0ZSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIGxldCB2ID0gc3RhdGUuZmluZChjaGFuZ2UpO1xuICAgICAgICBpZiAodiAhPT0gbnVsbCAmJiB2LnZhbCAhPT0gY2hhbmdlLnZhbClcbiAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgdGhpcy5lbWl0KCd0eG5fc3RhcnQnLCB7J3JlbW92ZSc6IGNoYW5nZX0sIFt7J3JlbW92ZSc6IGNoYW5nZX1dKTtcbiAgICAgICAgdGhpcy5fcHJpdl9jaGFuZ2VfcmVtb3ZlKGNoYW5nZSk7XG4gICAgICAgIHRoaXMuZW1pdCgndHhuX2VuZCcsIHsncmVtb3ZlJzogY2hhbmdlfSwgW3sncmVtb3ZlJzogY2hhbmdlfV0pO1xuXG4gICAgfVxuXG4gICAgdmFyX2xpc3QgKCkge1xuXG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl9zdGF0ZXMpLnNvcnQoKTtcblxuICAgIH1cblxuICAgIGZpcnN0ICgpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGxldCBmaXJzdF92YWxfY2hhbmdlcyA9IE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5maWx0ZXIoKHNuKSA9PiBzdGF0ZXNbc25dLnNpemUgPiAwKVxuICAgICAgICAgICAgLm1hcCgoc24pID0+IHN0YXRlc1tzbl0uaXRlcmF0b3IoKSlcbiAgICAgICAgICAgIC5tYXAoKGkpID0+IGkubmV4dCgpKVxuICAgICAgICAgICAgLnNvcnQodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcbiAgICAgICAgaWYgKGZpcnN0X3ZhbF9jaGFuZ2VzLmxlbmd0aCA9PT0gMClcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICBsZXQgZWFybGllc3RfdGltZXN0YW1wID0gZmlyc3RfdmFsX2NoYW5nZXNbMF0udGltZXN0YW1wO1xuICAgICAgICByZXR1cm4gZmlyc3RfdmFsX2NoYW5nZXNcbiAgICAgICAgICAgIC5maWx0ZXIoKGNoYW5nZSkgPT4gY2hhbmdlLnRpbWVzdGFtcCA9PT0gZWFybGllc3RfdGltZXN0YW1wKTtcblxuICAgIH1cblxuICAgIGxhc3QgKCkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgbGV0IGxhc3RfdmFsX2NoYW5nZXMgPSBPYmplY3Qua2V5cyhzdGF0ZXMpXG4gICAgICAgICAgICAuZmlsdGVyKChzbikgPT4gc3RhdGVzW3NuXS5zaXplID4gMClcbiAgICAgICAgICAgIC5tYXAoKHNuKSA9PiBzdGF0ZXNbc25dLml0ZXJhdG9yKCkpXG4gICAgICAgICAgICAubWFwKChpKSA9PiBpLnByZXYoKSlcbiAgICAgICAgICAgIC5zb3J0KHRlbXBvcmFsc3RhdGUuY2hhbmdlX2NtcCk7XG4gICAgICAgIGlmIChsYXN0X3ZhbF9jaGFuZ2VzLmxlbmd0aCA9PT0gMClcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICBsZXQgb2xkZXN0X3RpbWVzdGFtcCA9IGxhc3RfdmFsX2NoYW5nZXNbbGFzdF92YWxfY2hhbmdlcy5sZW5ndGggLSAxXS50aW1lc3RhbXA7XG4gICAgICAgIHJldHVybiBsYXN0X3ZhbF9jaGFuZ2VzXG4gICAgICAgICAgICAuZmlsdGVyKChjaGFuZ2UpID0+IGNoYW5nZS50aW1lc3RhbXAgPT09IG9sZGVzdF90aW1lc3RhbXApO1xuXG4gICAgfVxuXG4gICAgbmV4dCAoY3VycmVudCwgc3RfbmFtZSkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgaWYgKHN0X25hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW3N0X25hbWVdO1xuICAgICAgICAgICAgaWYgKHN0YXRlID09PSB1bmRlZmluZWQgfHwgc3RhdGUuc2l6ZSA9PT0gMClcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIHJldHVybiBzdGF0ZS51cHBlckJvdW5kKGN1cnJlbnQpLmRhdGEoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBuZXh0X3ZhbF9jaGFuZ2VzID0gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLmZpbHRlcigoc24pID0+IHN0YXRlc1tzbl0uc2l6ZSA+IDApXG4gICAgICAgICAgICAubWFwKChzbikgPT4gc3RhdGVzW3NuXS51cHBlckJvdW5kKGN1cnJlbnQpKVxuICAgICAgICAgICAgLm1hcCgoaSkgPT4ge1xuICAgICAgICAgICAgICAgIHdoaWxlIChpLmRhdGEoKSAhPT0gbnVsbCAmJiBpLmRhdGEoKS50aW1lc3RhbXAgPT09IGN1cnJlbnQudGltZXN0YW1wKVxuICAgICAgICAgICAgICAgICAgICBpLm5leHQoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gaS5kYXRhKCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmZpbHRlcigoY2hhbmdlKSA9PiBjaGFuZ2UgIT09IG51bGwpXG4gICAgICAgICAgICAuc29ydCh0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXApO1xuICAgICAgICBpZiAobmV4dF92YWxfY2hhbmdlcy5sZW5ndGggPT09IDApXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgbGV0IG5leHRfdGltZXN0YW1wID0gbmV4dF92YWxfY2hhbmdlc1swXS50aW1lc3RhbXA7XG4gICAgICAgIHJldHVybiBuZXh0X3ZhbF9jaGFuZ2VzXG4gICAgICAgICAgICAuZmlsdGVyKChjaGFuZ2UpID0+IGNoYW5nZS50aW1lc3RhbXAgPT09IG5leHRfdGltZXN0YW1wKTtcblxuICAgIH1cblxuICAgIHByZXYgKGN1cnJlbnQsIHN0X25hbWUpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGlmIChzdF9uYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxldCBzdGF0ZSA9IHN0YXRlc1tzdF9uYW1lXTtcbiAgICAgICAgICAgIGlmIChzdGF0ZSA9PT0gdW5kZWZpbmVkIHx8IHN0YXRlLnNpemUgPT09IDApXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICBsZXQgaXRlciA9IHN0YXRlLmxvd2VyQm91bmQoY3VycmVudCk7XG4gICAgICAgICAgICByZXR1cm4gaXRlci5wcmV2KCk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgcHJldl92YWxfY2hhbmdlcyA9IE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5maWx0ZXIoKHNuKSA9PiBzdGF0ZXNbc25dLnNpemUgPiAwKVxuICAgICAgICAgICAgLm1hcCgoc24pID0+IHN0YXRlc1tzbl0ubG93ZXJCb3VuZChjdXJyZW50KSlcbiAgICAgICAgICAgIC5tYXAoKGkpID0+IHtcbiAgICAgICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgICAgIGkucHJldigpO1xuICAgICAgICAgICAgICAgIH0gd2hpbGUgKGkuZGF0YSgpICE9PSBudWxsICYmIGkuZGF0YSgpLnRpbWVzdGFtcCA9PT0gY3VycmVudC50aW1lc3RhbXApO1xuICAgICAgICAgICAgICAgIHJldHVybiBpLmRhdGEoKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuZmlsdGVyKChjaGFuZ2UpID0+IGNoYW5nZSAhPT0gbnVsbClcbiAgICAgICAgICAgIC5zb3J0KHRlbXBvcmFsc3RhdGUuY2hhbmdlX2NtcCk7XG4gICAgICAgIGlmIChwcmV2X3ZhbF9jaGFuZ2VzLmxlbmd0aCA9PT0gMClcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICBsZXQgcHJldl90aW1lc3RhbXAgPSBwcmV2X3ZhbF9jaGFuZ2VzW3ByZXZfdmFsX2NoYW5nZXMubGVuZ3RoIC0gMV0udGltZXN0YW1wO1xuICAgICAgICByZXR1cm4gcHJldl92YWxfY2hhbmdlc1xuICAgICAgICAgICAgLmZpbHRlcigoY2hhbmdlKSA9PiBjaGFuZ2UudGltZXN0YW1wID09PSBwcmV2X3RpbWVzdGFtcCk7XG5cbiAgICB9XG5cbiAgICBhdCAodGltZXN0YW1wKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLmZpbHRlcigoc24pID0+IHN0YXRlc1tzbl0uc2l6ZSA+IDApXG4gICAgICAgICAgICAubWFwKChzbikgPT4gc3RhdGVzW3NuXS5maW5kKHsndGltZXN0YW1wJzogdGltZXN0YW1wfSkpXG4gICAgICAgICAgICAuZmlsdGVyKCh2KSA9PiB2ICE9PSBudWxsKVxuICAgICAgICAgICAgLnNvcnQodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcblxuICAgIH1cblxuICAgIGFmdGVyICh0aW1lc3RhbXApIHtcblxuICAgICAgICByZXR1cm4gdGhpcy5uZXh0KHsndGltZXN0YW1wJzogdGltZXN0YW1wfSk7XG5cbiAgICB9XG5cbiAgICBiZWZvcmUgKHRpbWVzdGFtcCkge1xuXG4gICAgICAgIHJldHVybiB0aGlzLnByZXYoeyd0aW1lc3RhbXAnOiB0aW1lc3RhbXB9KTtcblxuICAgIH1cblxuICAgIHN0YXRlICh0cywgc3RfbmFtZSkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgaWYgKHN0X25hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW3N0X25hbWVdO1xuICAgICAgICAgICAgaWYgKHN0YXRlID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICBsZXQgaXRlciA9IHN0YXRlLnVwcGVyQm91bmQoe3RpbWVzdGFtcDogdHN9KTtcbiAgICAgICAgICAgIGxldCByZWMgPSBpdGVyLnByZXYoKTtcbiAgICAgICAgICAgIHJldHVybiByZWMgPT09IG51bGwgPyBudWxsIDogcmVjLnZhbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhzdGF0ZXMpXG4gICAgICAgICAgICAuZmlsdGVyKChzbikgPT4gc3RhdGVzW3NuXS5zaXplID4gMClcbiAgICAgICAgICAgIC5yZWR1Y2UoKGFjYywgc24pID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgcmVjID0gdGhpcy5zdGF0ZSh0cywgc24pO1xuICAgICAgICAgICAgICAgIGlmIChyZWMgIT09IG51bGwpXG4gICAgICAgICAgICAgICAgICAgIGFjY1tzbl0gPSByZWM7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgICAgIH0sIHt9KTtcblxuICAgIH1cblxuICAgIHN0YXRlX2RldGFpbCAodHMsIHN0X25hbWUpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGlmIChzdF9uYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxldCBzdGF0ZSA9IHN0YXRlc1tzdF9uYW1lXTtcbiAgICAgICAgICAgIGlmIChzdGF0ZSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIHJldHVybiB7J2Zyb20nOiBudWxsLCAndG8nOiBudWxsfTtcbiAgICAgICAgICAgIGxldCBpdGVyID0gc3RhdGUudXBwZXJCb3VuZCh7dGltZXN0YW1wOiB0c30pO1xuICAgICAgICAgICAgbGV0IG5leHRfcmVjID0gaXRlci5kYXRhKCk7XG4gICAgICAgICAgICBsZXQgY3VyX3JlYyA9IGl0ZXIucHJldigpO1xuICAgICAgICAgICAgaWYgKGN1cl9yZWMgPT09IG51bGwgJiYgbmV4dF9yZWMgPT09IG51bGwpXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICdmcm9tJzogY3VyX3JlYyxcbiAgICAgICAgICAgICAgICAndG8nOiBuZXh0X3JlY1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhzdGF0ZXMpXG4gICAgICAgICAgICAuc29ydCgpXG4gICAgICAgICAgICAucmVkdWNlKChhY2MsIHNuKSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW3NuXTtcbiAgICAgICAgICAgICAgICBsZXQgaXRlciA9IHN0YXRlLnVwcGVyQm91bmQoe3RpbWVzdGFtcDogdHN9KTtcbiAgICAgICAgICAgICAgICBsZXQgbmV4dF9yZWMgPSBpdGVyLmRhdGEoKTtcbiAgICAgICAgICAgICAgICBsZXQgY3VyX3JlYyA9IGl0ZXIucHJldigpO1xuICAgICAgICAgICAgICAgIGlmIChjdXJfcmVjICE9PSBudWxsIHx8IG5leHRfcmVjICE9PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICBhY2MucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAnZnJvbSc6IGN1cl9yZWMsXG4gICAgICAgICAgICAgICAgICAgICAgICAndG8nOiBuZXh0X3JlY1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgICAgICAgfSwgW10pO1xuXG4gICAgfVxuXG4gICAgYmV0d2VlbiAoZnJvbV90cywgdG9fdHMsIGdyZWVkeSwgc3RfbmFtZSkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgaWYgKGdyZWVkeSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgZ3JlZWR5ID0gZmFsc2U7XG5cbiAgICAgICAgbGV0IHN0X25hbWVzID0gc3RfbmFtZSA9PT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IHRoaXMudmFyX2xpc3QoKVxuICAgICAgICAgICAgOiBbc3RfbmFtZV07XG5cbiAgICAgICAgbGV0IGNoYW5nZXMgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdF9uYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW3N0X25hbWVzW2ldXTtcbiAgICAgICAgICAgIGxldCBpdGVyID0gc3RhdGUudXBwZXJCb3VuZCh7dGltZXN0YW1wOiBmcm9tX3RzfSk7XG4gICAgICAgICAgICBsZXQgY3VyX3JlYyA9IGl0ZXIucHJldigpO1xuICAgICAgICAgICAgaWYgKGN1cl9yZWMgIT09IG51bGwgJiYgKGdyZWVkeSB8fCBjdXJfcmVjLnRpbWVzdGFtcCA9PT0gZnJvbV90cykpXG4gICAgICAgICAgICAgICAgY2hhbmdlcy5wdXNoKGN1cl9yZWMpO1xuICAgICAgICAgICAgd2hpbGUgKChjdXJfcmVjID0gaXRlci5uZXh0KCkpICYmIGN1cl9yZWMudGltZXN0YW1wIDw9IHRvX3RzKSB7XG4gICAgICAgICAgICAgICAgY2hhbmdlcy5wdXNoKGN1cl9yZWMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNoYW5nZXMuc29ydCh0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXApO1xuXG4gICAgfVxuXG4gICAgcmVtb3ZlX3ZhciAodmFyX25hbWUpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuICAgICAgICBsZXQgc3RhdGUgID0gc3RhdGVzW3Zhcl9uYW1lXTtcblxuICAgICAgICBpZiAoc3RhdGUgJiYgc3RhdGUuc2l6ZSA9PT0gMCkge1xuICAgICAgICAgICAgZGVsZXRlIHN0YXRlc1t2YXJfbmFtZV07XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcblxuICAgIH1cblxuICAgIF9wcml2X2FkZF9zdGF0ZSAoc3RfbmFtZSkge1xuXG4gICAgICAgIHRoaXMuZW1pdCgnbmV3X3ZhcicsIHN0X25hbWUpO1xuICAgICAgICB0aGlzLl9zdGF0ZXNbc3RfbmFtZV0gPSBuZXcgYmludHJlZXMuUkJUcmVlKHRlbXBvcmFsc3RhdGUuY2hhbmdlX2NtcCk7XG5cbiAgICB9XG5cbiAgICBfcHJpdl9jaGFuZ2VfYWRkIChjaGFuZ2UpIHtcblxuICAgICAgICB0aGlzLmVtaXQoJ2FkZCcsIHsndGltZXN0YW1wJzogY2hhbmdlLnRpbWVzdGFtcCwgJ25hbWUnOiBjaGFuZ2UubmFtZSwgJ3ZhbCc6IGNoYW5nZS52YWx9KTtcbiAgICAgICAgdGhpcy5fc3RhdGVzW2NoYW5nZS5uYW1lXS5pbnNlcnQoY2hhbmdlKTtcblxuICAgIH1cblxuICAgIF9wcml2X2NoYW5nZV9yZW1vdmUgKGNoYW5nZSkge1xuXG4gICAgICAgIHRoaXMuZW1pdCgncm0nLCB7J3RpbWVzdGFtcCc6IGNoYW5nZS50aW1lc3RhbXAsICduYW1lJzogY2hhbmdlLm5hbWUsICd2YWwnOiBjaGFuZ2UudmFsfSk7XG4gICAgICAgIHRoaXMuX3N0YXRlc1tjaGFuZ2UubmFtZV0ucmVtb3ZlKGNoYW5nZSk7XG5cbiAgICB9XG5cbiAgICBfcHJpdl9jaGFuZ2VfY2hhbmdlIChjaGFuZ2UsIG5ld192YWwpIHtcblxuICAgICAgICBsZXQgb2xkX3ZhbCA9IGNoYW5nZS52YWw7XG5cbiAgICAgICAgdGhpcy5lbWl0KCdjaGFuZ2UnLCB7J3RpbWVzdGFtcCc6IGNoYW5nZS50aW1lc3RhbXAsICduYW1lJzogY2hhbmdlLm5hbWUsICd2YWwnOiBvbGRfdmFsfSwgbmV3X3ZhbCk7XG4gICAgICAgIGNoYW5nZS52YWwgPSBuZXdfdmFsO1xuXG4gICAgfVxuXG4gICAgc3RhdGljIGNoYW5nZV9jbXAgKGEsIGIpIHtcblxuICAgICAgICByZXR1cm4gYS50aW1lc3RhbXAgPCBiLnRpbWVzdGFtcCA/IC0xXG4gICAgICAgICAgICA6IGEudGltZXN0YW1wID4gYi50aW1lc3RhbXAgPyAxXG4gICAgICAgICAgICA6IGEubmFtZSA8IGIubmFtZSA/IC0xXG4gICAgICAgICAgICA6IGEubmFtZSA+IGIubmFtZSA/IDFcbiAgICAgICAgICAgIDogMDtcblxuICAgIH1cblxufVxuXG5cbmV4cG9ydCBkZWZhdWx0IHRlbXBvcmFsc3RhdGU7XG4iXX0=
//# sourceMappingURL=temporalstate_es5.js.map
