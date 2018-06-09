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
        var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        _classCallCheck(this, temporalstate);

        var _this = _possibleConstructorReturn(this, (temporalstate.__proto__ || Object.getPrototypeOf(temporalstate)).call(this));

        _this._states = {};
        _this._txn = [];
        _this._valeqf = params.valeqf ? params.valeqf : temporalstate.change_valeqf;

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
            var valeqf = this._valeqf;

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
                    if (next !== null && valeqf(next.val, st_val)) {
                        txn_descr.push({ 'rm': next });
                        txn_funs.push(this._priv_change_remove.bind(this, next));
                    }
                }
            } else if (cur.timestamp === ts) {
                if (!valeqf(cur.val, st_val)) {
                    var prev = iter.prev();
                    if (prev === null) {
                        if (st_val === null) {
                            txn_descr.push({ 'remove': cur });
                            txn_funs.push(this._priv_change_remove.bind(this, cur));
                        } else {
                            txn_descr.push({ 'change': cur, 'new_val': st_val });
                            txn_funs.push(this._priv_change_change.bind(this, cur, st_val));
                        }
                        if (next !== null && valeqf(next.val, st_val)) {
                            txn_descr.push({ 'remove': next });
                            txn_funs.push(this._priv_change_remove.bind(this, next));
                        }
                    } else if (valeqf(prev.val, st_val)) {
                        txn_descr.push({ 'remove': cur });
                        txn_funs.push(this._priv_change_remove.bind(this, cur));
                        if (next !== null && valeqf(next.val, st_val)) {
                            txn_descr.push({ 'remove': next });
                            txn_funs.push(this._priv_change_remove.bind(this, next));
                        }
                    } else {
                        txn_descr.push({ 'change': cur, 'new_val': st_val });
                        txn_funs.push(this._priv_change_change.bind(this, cur, st_val));
                    }
                }
            } else if (!valeqf(cur.val, st_val)) {
                txn_descr.push({ 'add': { 'timestamp': ts, 'name': st_name, 'val': st_val } });
                txn_funs.push(this._priv_change_add.bind(this, { 'timestamp': ts, 'name': st_name, 'val': st_val }));
                if (next !== null && valeqf(next.val, st_val)) {
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
            var valeqf = this._valeqf;
            var state = states[change.name];

            if (state === undefined) return;

            var v = state.find(change);
            if (v !== null && !valeqf(v.val, change.val)) return;

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
        value: function first(st_name) {

            var states = this._states;

            if (st_name !== undefined) {
                var state = states[st_name];
                if (state === undefined || state.size === 0) return null;
                return state.iterator().next();
            }

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
        value: function last(st_name) {

            var states = this._states;

            if (st_name !== undefined) {
                var state = states[st_name];
                if (state === undefined || state.size === 0) return null;
                return state.iterator().prev();
            }

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
                this.emit('rm_var', var_name);
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
    }, {
        key: 'change_valeqf',
        value: function change_valeqf(a, b) {

            return a === b;
        }
    }]);

    return temporalstate;
}(_events2.default);

exports.default = temporalstate;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpYi90ZW1wb3JhbHN0YXRlLmpzIl0sIm5hbWVzIjpbInRlbXBvcmFsc3RhdGUiLCJwYXJhbXMiLCJfc3RhdGVzIiwiX3R4biIsIl92YWxlcWYiLCJ2YWxlcWYiLCJjaGFuZ2VfdmFsZXFmIiwiY2hhbmdlcyIsInN0YXRlcyIsInZhbF9pdGVyX2dycCIsIk9iamVjdCIsImtleXMiLCJmaWx0ZXIiLCJzbiIsInNpemUiLCJtYXAiLCJpdGVyYXRvciIsImkiLCJuZXh0Iiwic29ydCIsImEiLCJiIiwiY2hhbmdlX2NtcCIsImxlbmd0aCIsInYiLCJwdXNoIiwiaWQiLCJkZXNjciIsImZ1biIsInR4bl9zdGFjayIsImVtaXQiLCJwb3AiLCJjaGFuZ2UiLCJzdF9uYW1lIiwibmFtZSIsInN0X3ZhbCIsInZhbCIsInRzIiwidGltZXN0YW1wIiwidW5kZWZpbmVkIiwiX3ByaXZfYWRkX3N0YXRlIiwic3RhdGUiLCJpdGVyIiwidXBwZXJCb3VuZCIsImRhdGEiLCJjdXIiLCJwcmV2IiwidHhuX2Rlc2NyIiwidHhuX2Z1bnMiLCJfcHJpdl9jaGFuZ2VfYWRkIiwiYmluZCIsIl9wcml2X2NoYW5nZV9yZW1vdmUiLCJfcHJpdl9jaGFuZ2VfY2hhbmdlIiwidHhuIiwiZm9yRWFjaCIsImYiLCJmaW5kIiwiZmlyc3RfdmFsX2NoYW5nZXMiLCJlYXJsaWVzdF90aW1lc3RhbXAiLCJsYXN0X3ZhbF9jaGFuZ2VzIiwib2xkZXN0X3RpbWVzdGFtcCIsImN1cnJlbnQiLCJuZXh0X3ZhbF9jaGFuZ2VzIiwibmV4dF90aW1lc3RhbXAiLCJsb3dlckJvdW5kIiwicHJldl92YWxfY2hhbmdlcyIsInByZXZfdGltZXN0YW1wIiwicmVjIiwicmVkdWNlIiwiYWNjIiwibmV4dF9yZWMiLCJjdXJfcmVjIiwiZnJvbV90cyIsInRvX3RzIiwiZ3JlZWR5Iiwic3RfbmFtZXMiLCJ2YXJfbGlzdCIsInZhcl9uYW1lIiwiUkJUcmVlIiwiaW5zZXJ0IiwicmVtb3ZlIiwibmV3X3ZhbCIsIm9s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ZSI6InRlbXBvcmFsc3RhdGVfZXM1LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGJpbnRyZWVzIGZyb20gJ2JpbnRyZWVzJztcbmltcG9ydCBldmVudF9lbWl0dGVyIGZyb20gJ2V2ZW50cyc7XG5cblxuY2xhc3MgdGVtcG9yYWxzdGF0ZSBleHRlbmRzIGV2ZW50X2VtaXR0ZXIge1xuXG4gICAgY29uc3RydWN0b3IgKHBhcmFtcyA9IHt9KSB7XG5cbiAgICAgICAgc3VwZXIoKTtcblxuICAgICAgICB0aGlzLl9zdGF0ZXMgPSB7fTtcbiAgICAgICAgdGhpcy5fdHhuICAgID0gW107XG4gICAgICAgIHRoaXMuX3ZhbGVxZiA9IHBhcmFtcy52YWxlcWYgPyBwYXJhbXMudmFsZXFmIDogdGVtcG9yYWxzdGF0ZS5jaGFuZ2VfdmFsZXFmO1xuXG4gICAgfVxuXG4gICAgY2hhbmdlX2xpc3QgKCkge1xuXG4gICAgICAgIGxldCBjaGFuZ2VzID0gW107XG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgbGV0IHZhbF9pdGVyX2dycCA9IE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5maWx0ZXIoKHNuKSA9PiBzdGF0ZXNbc25dLnNpemUgPiAwKVxuICAgICAgICAgICAgLm1hcCgoc24pID0+IHN0YXRlc1tzbl0uaXRlcmF0b3IoKSlcbiAgICAgICAgICAgIC5tYXAoKGkpID0+IFtpLm5leHQoKSwgaV0pXG4gICAgICAgICAgICAuc29ydCgoYSwgYikgPT4gdGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKGFbMF0sIGJbMF0pKTtcbiAgICAgICAgd2hpbGUgKHZhbF9pdGVyX2dycC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBsZXQgdiA9IHZhbF9pdGVyX2dycFswXVswXTtcbiAgICAgICAgICAgIGxldCBpID0gdmFsX2l0ZXJfZ3JwWzBdWzFdO1xuICAgICAgICAgICAgY2hhbmdlcy5wdXNoKHYpO1xuICAgICAgICAgICAgdmFsX2l0ZXJfZ3JwWzBdID0gW2kubmV4dCgpLCBpXTtcbiAgICAgICAgICAgIHZhbF9pdGVyX2dycCA9IHZhbF9pdGVyX2dycFxuICAgICAgICAgICAgICAgIC5maWx0ZXIoKGEpID0+IGFbMF0gIT09IG51bGwpXG4gICAgICAgICAgICAgICAgLnNvcnQoKGEsIGIpID0+IHRlbXBvcmFsc3RhdGUuY2hhbmdlX2NtcChhWzBdLCBiWzBdKSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY2hhbmdlcztcblxuICAgIH1cblxuICAgIHR4biAoaWQsIGRlc2NyLCBmdW4pIHtcblxuICAgICAgICBsZXQgdHhuX3N0YWNrID0gdGhpcy5fdHhuO1xuXG4gICAgICAgIHR4bl9zdGFjay5wdXNoKHtcbiAgICAgICAgICAgICdpZCc6ICAgIGlkLFxuICAgICAgICAgICAgJ2Rlc2NyJzogZGVzY3IsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuZW1pdCgndHhuX3N0YXJ0JywgaWQsIGRlc2NyLCB0eG5fc3RhY2spO1xuICAgICAgICBmdW4oKTtcbiAgICAgICAgdGhpcy5lbWl0KCd0eG5fZW5kJywgaWQsIGRlc2NyLCB0eG5fc3RhY2spO1xuXG4gICAgICAgIHR4bl9zdGFjay5wb3AoKTtcblxuICAgIH1cblxuICAgIGFkZF9jaGFuZ2UgKGNoYW5nZSkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG4gICAgICAgIGxldCB2YWxlcWYgPSB0aGlzLl92YWxlcWY7XG5cbiAgICAgICAgbGV0IHN0X25hbWUgPSBjaGFuZ2UubmFtZTtcbiAgICAgICAgbGV0IHN0X3ZhbCAgPSBjaGFuZ2UudmFsO1xuICAgICAgICBsZXQgdHMgICAgICA9IGNoYW5nZS50aW1lc3RhbXA7XG5cbiAgICAgICAgaWYgKHN0YXRlc1tzdF9uYW1lXSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgdGhpcy5fcHJpdl9hZGRfc3RhdGUoc3RfbmFtZSk7XG5cbiAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW3N0X25hbWVdO1xuICAgICAgICBsZXQgaXRlciA9IHN0YXRlLnVwcGVyQm91bmQoY2hhbmdlKTtcbiAgICAgICAgbGV0IG5leHQgPSBpdGVyLmRhdGEoKTtcbiAgICAgICAgbGV0IGN1ciA9IGl0ZXIucHJldigpO1xuXG4gICAgICAgIGxldCB0eG5fZGVzY3IgPSBbXTtcbiAgICAgICAgbGV0IHR4bl9mdW5zID0gW107XG5cbiAgICAgICAgaWYgKGN1ciA9PT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKHN0X3ZhbCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHR4bl9kZXNjci5wdXNoKHsnYWRkJzogeyd0aW1lc3RhbXAnOiB0cywgJ25hbWUnOiBzdF9uYW1lLCAndmFsJzogc3RfdmFsfX0pO1xuICAgICAgICAgICAgICAgIHR4bl9mdW5zLnB1c2godGhpcy5fcHJpdl9jaGFuZ2VfYWRkLmJpbmQodGhpcywgeyd0aW1lc3RhbXAnOiB0cywgJ25hbWUnOiBzdF9uYW1lLCAndmFsJzogc3RfdmFsfSkpO1xuICAgICAgICAgICAgICAgIGlmIChuZXh0ICE9PSBudWxsICYmIHZhbGVxZihuZXh0LnZhbCwgc3RfdmFsKSkge1xuICAgICAgICAgICAgICAgICAgICB0eG5fZGVzY3IucHVzaCh7J3JtJzogbmV4dH0pO1xuICAgICAgICAgICAgICAgICAgICB0eG5fZnVucy5wdXNoKHRoaXMuX3ByaXZfY2hhbmdlX3JlbW92ZS5iaW5kKHRoaXMsIG5leHQpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoY3VyLnRpbWVzdGFtcCA9PT0gdHMpIHtcbiAgICAgICAgICAgIGlmICghdmFsZXFmKGN1ci52YWwsIHN0X3ZhbCkpIHtcbiAgICAgICAgICAgICAgICBsZXQgcHJldiA9IGl0ZXIucHJldigpO1xuICAgICAgICAgICAgICAgIGlmIChwcmV2ID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdF92YWwgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR4bl9kZXNjci5wdXNoKHsncmVtb3ZlJzogY3VyfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eG5fZnVucy5wdXNoKHRoaXMuX3ByaXZfY2hhbmdlX3JlbW92ZS5iaW5kKHRoaXMsIGN1cikpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHhuX2Rlc2NyLnB1c2goeydjaGFuZ2UnOiBjdXIsICduZXdfdmFsJzogc3RfdmFsfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eG5fZnVucy5wdXNoKHRoaXMuX3ByaXZfY2hhbmdlX2NoYW5nZS5iaW5kKHRoaXMsIGN1ciwgc3RfdmFsKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKG5leHQgIT09IG51bGwgJiYgdmFsZXFmKG5leHQudmFsLCBzdF92YWwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eG5fZGVzY3IucHVzaCh7J3JlbW92ZSc6IG5leHR9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR4bl9mdW5zLnB1c2godGhpcy5fcHJpdl9jaGFuZ2VfcmVtb3ZlLmJpbmQodGhpcywgbmV4dCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh2YWxlcWYocHJldi52YWwsIHN0X3ZhbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdHhuX2Rlc2NyLnB1c2goeydyZW1vdmUnOiBjdXJ9KTtcbiAgICAgICAgICAgICAgICAgICAgdHhuX2Z1bnMucHVzaCh0aGlzLl9wcml2X2NoYW5nZV9yZW1vdmUuYmluZCh0aGlzLCBjdXIpKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5leHQgIT09IG51bGwgJiYgdmFsZXFmKG5leHQudmFsLCBzdF92YWwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eG5fZGVzY3IucHVzaCh7J3JlbW92ZSc6IG5leHR9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR4bl9mdW5zLnB1c2godGhpcy5fcHJpdl9jaGFuZ2VfcmVtb3ZlLmJpbmQodGhpcywgbmV4dCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdHhuX2Rlc2NyLnB1c2goeydjaGFuZ2UnOiBjdXIsICduZXdfdmFsJzogc3RfdmFsfSk7XG4gICAgICAgICAgICAgICAgICAgIHR4bl9mdW5zLnB1c2godGhpcy5fcHJpdl9jaGFuZ2VfY2hhbmdlLmJpbmQodGhpcywgY3VyLCBzdF92YWwpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoIXZhbGVxZihjdXIudmFsLCBzdF92YWwpKSB7XG4gICAgICAgICAgICB0eG5fZGVzY3IucHVzaCh7J2FkZCc6IHsndGltZXN0YW1wJzogdHMsICduYW1lJzogc3RfbmFtZSwgJ3ZhbCc6IHN0X3ZhbH19KTtcbiAgICAgICAgICAgIHR4bl9mdW5zLnB1c2godGhpcy5fcHJpdl9jaGFuZ2VfYWRkLmJpbmQodGhpcywgeyd0aW1lc3RhbXAnOiB0cywgJ25hbWUnOiBzdF9uYW1lLCAndmFsJzogc3RfdmFsfSkpO1xuICAgICAgICAgICAgaWYgKG5leHQgIT09IG51bGwgJiYgdmFsZXFmKG5leHQudmFsLCBzdF92YWwpKSB7XG4gICAgICAgICAgICAgICAgdHhuX2Rlc2NyLnB1c2goeydybSc6IG5leHR9KTtcbiAgICAgICAgICAgICAgICB0eG5fZnVucy5wdXNoKHRoaXMuX3ByaXZfY2hhbmdlX3JlbW92ZS5iaW5kKHRoaXMsIG5leHQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudHhuKFxuICAgICAgICAgICAgeydhZGQnOiB7J3RpbWVzdGFtcCc6IHRzLCAnbmFtZSc6IHN0X25hbWUsICd2YWwnOiBzdF92YWx9fSxcbiAgICAgICAgICAgIHR4bl9kZXNjcixcbiAgICAgICAgICAgIGZ1bmN0aW9uICgpIHsgdHhuX2Z1bnMuZm9yRWFjaCgoZikgPT4gZigpKTsgfVxuICAgICAgICApO1xuXG4gICAgfVxuXG4gICAgcmVtb3ZlX2NoYW5nZSAoY2hhbmdlKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcbiAgICAgICAgbGV0IHZhbGVxZiA9IHRoaXMuX3ZhbGVxZjtcbiAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW2NoYW5nZS5uYW1lXTtcblxuICAgICAgICBpZiAoc3RhdGUgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICBsZXQgdiA9IHN0YXRlLmZpbmQoY2hhbmdlKTtcbiAgICAgICAgaWYgKHYgIT09IG51bGwgJiYgIXZhbGVxZih2LnZhbCwgY2hhbmdlLnZhbCkpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHRoaXMuZW1pdCgndHhuX3N0YXJ0JywgeydyZW1vdmUnOiBjaGFuZ2V9LCBbeydyZW1vdmUnOiBjaGFuZ2V9XSk7XG4gICAgICAgIHRoaXMuX3ByaXZfY2hhbmdlX3JlbW92ZShjaGFuZ2UpO1xuICAgICAgICB0aGlzLmVtaXQoJ3R4bl9lbmQnLCB7J3JlbW92ZSc6IGNoYW5nZX0sIFt7J3JlbW92ZSc6IGNoYW5nZX1dKTtcblxuICAgIH1cblxuICAgIHZhcl9saXN0ICgpIHtcblxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fc3RhdGVzKS5zb3J0KCk7XG5cbiAgICB9XG5cbiAgICBmaXJzdCAoc3RfbmFtZSkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgaWYgKHN0X25hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW3N0X25hbWVdO1xuICAgICAgICAgICAgaWYgKHN0YXRlID09PSB1bmRlZmluZWQgfHwgc3RhdGUuc2l6ZSA9PT0gMClcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIHJldHVybiBzdGF0ZS5pdGVyYXRvcigpLm5leHQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBmaXJzdF92YWxfY2hhbmdlcyA9IE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5maWx0ZXIoKHNuKSA9PiBzdGF0ZXNbc25dLnNpemUgPiAwKVxuICAgICAgICAgICAgLm1hcCgoc24pID0+IHN0YXRlc1tzbl0uaXRlcmF0b3IoKSlcbiAgICAgICAgICAgIC5tYXAoKGkpID0+IGkubmV4dCgpKVxuICAgICAgICAgICAgLnNvcnQodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcbiAgICAgICAgaWYgKGZpcnN0X3ZhbF9jaGFuZ2VzLmxlbmd0aCA9PT0gMClcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICBsZXQgZWFybGllc3RfdGltZXN0YW1wID0gZmlyc3RfdmFsX2NoYW5nZXNbMF0udGltZXN0YW1wO1xuICAgICAgICByZXR1cm4gZmlyc3RfdmFsX2NoYW5nZXNcbiAgICAgICAgICAgIC5maWx0ZXIoKGNoYW5nZSkgPT4gY2hhbmdlLnRpbWVzdGFtcCA9PT0gZWFybGllc3RfdGltZXN0YW1wKTtcblxuICAgIH1cblxuICAgIGxhc3QgKHN0X25hbWUpIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIGlmIChzdF9uYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxldCBzdGF0ZSA9IHN0YXRlc1tzdF9uYW1lXTtcbiAgICAgICAgICAgIGlmIChzdGF0ZSA9PT0gdW5kZWZpbmVkIHx8IHN0YXRlLnNpemUgPT09IDApXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICByZXR1cm4gc3RhdGUuaXRlcmF0b3IoKS5wcmV2KCk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgbGFzdF92YWxfY2hhbmdlcyA9IE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5maWx0ZXIoKHNuKSA9PiBzdGF0ZXNbc25dLnNpemUgPiAwKVxuICAgICAgICAgICAgLm1hcCgoc24pID0+IHN0YXRlc1tzbl0uaXRlcmF0b3IoKSlcbiAgICAgICAgICAgIC5tYXAoKGkpID0+IGkucHJldigpKVxuICAgICAgICAgICAgLnNvcnQodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcbiAgICAgICAgaWYgKGxhc3RfdmFsX2NoYW5nZXMubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIGxldCBvbGRlc3RfdGltZXN0YW1wID0gbGFzdF92YWxfY2hhbmdlc1tsYXN0X3ZhbF9jaGFuZ2VzLmxlbmd0aCAtIDFdLnRpbWVzdGFtcDtcbiAgICAgICAgcmV0dXJuIGxhc3RfdmFsX2NoYW5nZXNcbiAgICAgICAgICAgIC5maWx0ZXIoKGNoYW5nZSkgPT4gY2hhbmdlLnRpbWVzdGFtcCA9PT0gb2xkZXN0X3RpbWVzdGFtcCk7XG5cbiAgICB9XG5cbiAgICBuZXh0IChjdXJyZW50LCBzdF9uYW1lKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBpZiAoc3RfbmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc3RfbmFtZV07XG4gICAgICAgICAgICBpZiAoc3RhdGUgPT09IHVuZGVmaW5lZCB8fCBzdGF0ZS5zaXplID09PSAwKVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgcmV0dXJuIHN0YXRlLnVwcGVyQm91bmQoY3VycmVudCkuZGF0YSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IG5leHRfdmFsX2NoYW5nZXMgPSBPYmplY3Qua2V5cyhzdGF0ZXMpXG4gICAgICAgICAgICAuZmlsdGVyKChzbikgPT4gc3RhdGVzW3NuXS5zaXplID4gMClcbiAgICAgICAgICAgIC5tYXAoKHNuKSA9PiBzdGF0ZXNbc25dLnVwcGVyQm91bmQoY3VycmVudCkpXG4gICAgICAgICAgICAubWFwKChpKSA9PiB7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGkuZGF0YSgpICE9PSBudWxsICYmIGkuZGF0YSgpLnRpbWVzdGFtcCA9PT0gY3VycmVudC50aW1lc3RhbXApXG4gICAgICAgICAgICAgICAgICAgIGkubmV4dCgpO1xuICAgICAgICAgICAgICAgIHJldHVybiBpLmRhdGEoKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuZmlsdGVyKChjaGFuZ2UpID0+IGNoYW5nZSAhPT0gbnVsbClcbiAgICAgICAgICAgIC5zb3J0KHRlbXBvcmFsc3RhdGUuY2hhbmdlX2NtcCk7XG4gICAgICAgIGlmIChuZXh0X3ZhbF9jaGFuZ2VzLmxlbmd0aCA9PT0gMClcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICBsZXQgbmV4dF90aW1lc3RhbXAgPSBuZXh0X3ZhbF9jaGFuZ2VzWzBdLnRpbWVzdGFtcDtcbiAgICAgICAgcmV0dXJuIG5leHRfdmFsX2NoYW5nZXNcbiAgICAgICAgICAgIC5maWx0ZXIoKGNoYW5nZSkgPT4gY2hhbmdlLnRpbWVzdGFtcCA9PT0gbmV4dF90aW1lc3RhbXApO1xuXG4gICAgfVxuXG4gICAgcHJldiAoY3VycmVudCwgc3RfbmFtZSkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgaWYgKHN0X25hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW3N0X25hbWVdO1xuICAgICAgICAgICAgaWYgKHN0YXRlID09PSB1bmRlZmluZWQgfHwgc3RhdGUuc2l6ZSA9PT0gMClcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIGxldCBpdGVyID0gc3RhdGUubG93ZXJCb3VuZChjdXJyZW50KTtcbiAgICAgICAgICAgIHJldHVybiBpdGVyLnByZXYoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBwcmV2X3ZhbF9jaGFuZ2VzID0gT2JqZWN0LmtleXMoc3RhdGVzKVxuICAgICAgICAgICAgLmZpbHRlcigoc24pID0+IHN0YXRlc1tzbl0uc2l6ZSA+IDApXG4gICAgICAgICAgICAubWFwKChzbikgPT4gc3RhdGVzW3NuXS5sb3dlckJvdW5kKGN1cnJlbnQpKVxuICAgICAgICAgICAgLm1hcCgoaSkgPT4ge1xuICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgaS5wcmV2KCk7XG4gICAgICAgICAgICAgICAgfSB3aGlsZSAoaS5kYXRhKCkgIT09IG51bGwgJiYgaS5kYXRhKCkudGltZXN0YW1wID09PSBjdXJyZW50LnRpbWVzdGFtcCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGkuZGF0YSgpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5maWx0ZXIoKGNoYW5nZSkgPT4gY2hhbmdlICE9PSBudWxsKVxuICAgICAgICAgICAgLnNvcnQodGVtcG9yYWxzdGF0ZS5jaGFuZ2VfY21wKTtcbiAgICAgICAgaWYgKHByZXZfdmFsX2NoYW5nZXMubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIGxldCBwcmV2X3RpbWVzdGFtcCA9IHByZXZfdmFsX2NoYW5nZXNbcHJldl92YWxfY2hhbmdlcy5sZW5ndGggLSAxXS50aW1lc3RhbXA7XG4gICAgICAgIHJldHVybiBwcmV2X3ZhbF9jaGFuZ2VzXG4gICAgICAgICAgICAuZmlsdGVyKChjaGFuZ2UpID0+IGNoYW5nZS50aW1lc3RhbXAgPT09IHByZXZfdGltZXN0YW1wKTtcblxuICAgIH1cblxuICAgIGF0ICh0aW1lc3RhbXApIHtcblxuICAgICAgICBsZXQgc3RhdGVzID0gdGhpcy5fc3RhdGVzO1xuXG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhzdGF0ZXMpXG4gICAgICAgICAgICAuZmlsdGVyKChzbikgPT4gc3RhdGVzW3NuXS5zaXplID4gMClcbiAgICAgICAgICAgIC5tYXAoKHNuKSA9PiBzdGF0ZXNbc25dLmZpbmQoeyd0aW1lc3RhbXAnOiB0aW1lc3RhbXB9KSlcbiAgICAgICAgICAgIC5maWx0ZXIoKHYpID0+IHYgIT09IG51bGwpXG4gICAgICAgICAgICAuc29ydCh0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXApO1xuXG4gICAgfVxuXG4gICAgYWZ0ZXIgKHRpbWVzdGFtcCkge1xuXG4gICAgICAgIHJldHVybiB0aGlzLm5leHQoeyd0aW1lc3RhbXAnOiB0aW1lc3RhbXB9KTtcblxuICAgIH1cblxuICAgIGJlZm9yZSAodGltZXN0YW1wKSB7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMucHJldih7J3RpbWVzdGFtcCc6IHRpbWVzdGFtcH0pO1xuXG4gICAgfVxuXG4gICAgc3RhdGUgKHRzLCBzdF9uYW1lKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBpZiAoc3RfbmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc3RfbmFtZV07XG4gICAgICAgICAgICBpZiAoc3RhdGUgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIGxldCBpdGVyID0gc3RhdGUudXBwZXJCb3VuZCh7dGltZXN0YW1wOiB0c30pO1xuICAgICAgICAgICAgbGV0IHJlYyA9IGl0ZXIucHJldigpO1xuICAgICAgICAgICAgcmV0dXJuIHJlYyA9PT0gbnVsbCA/IG51bGwgOiByZWMudmFsO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5maWx0ZXIoKHNuKSA9PiBzdGF0ZXNbc25dLnNpemUgPiAwKVxuICAgICAgICAgICAgLnJlZHVjZSgoYWNjLCBzbikgPT4ge1xuICAgICAgICAgICAgICAgIGxldCByZWMgPSB0aGlzLnN0YXRlKHRzLCBzbik7XG4gICAgICAgICAgICAgICAgaWYgKHJlYyAhPT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgYWNjW3NuXSA9IHJlYztcbiAgICAgICAgICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgICAgICAgfSwge30pO1xuXG4gICAgfVxuXG4gICAgc3RhdGVfZGV0YWlsICh0cywgc3RfbmFtZSkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG5cbiAgICAgICAgaWYgKHN0X25hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbGV0IHN0YXRlID0gc3RhdGVzW3N0X25hbWVdO1xuICAgICAgICAgICAgaWYgKHN0YXRlID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsnZnJvbSc6IG51bGwsICd0byc6IG51bGx9O1xuICAgICAgICAgICAgbGV0IGl0ZXIgPSBzdGF0ZS51cHBlckJvdW5kKHt0aW1lc3RhbXA6IHRzfSk7XG4gICAgICAgICAgICBsZXQgbmV4dF9yZWMgPSBpdGVyLmRhdGEoKTtcbiAgICAgICAgICAgIGxldCBjdXJfcmVjID0gaXRlci5wcmV2KCk7XG4gICAgICAgICAgICBpZiAoY3VyX3JlYyA9PT0gbnVsbCAmJiBuZXh0X3JlYyA9PT0gbnVsbClcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgJ2Zyb20nOiBjdXJfcmVjLFxuICAgICAgICAgICAgICAgICd0byc6IG5leHRfcmVjXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHN0YXRlcylcbiAgICAgICAgICAgIC5zb3J0KClcbiAgICAgICAgICAgIC5yZWR1Y2UoKGFjYywgc24pID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc25dO1xuICAgICAgICAgICAgICAgIGxldCBpdGVyID0gc3RhdGUudXBwZXJCb3VuZCh7dGltZXN0YW1wOiB0c30pO1xuICAgICAgICAgICAgICAgIGxldCBuZXh0X3JlYyA9IGl0ZXIuZGF0YSgpO1xuICAgICAgICAgICAgICAgIGxldCBjdXJfcmVjID0gaXRlci5wcmV2KCk7XG4gICAgICAgICAgICAgICAgaWYgKGN1cl9yZWMgIT09IG51bGwgfHwgbmV4dF9yZWMgIT09IG51bGwpXG4gICAgICAgICAgICAgICAgICAgIGFjYy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdmcm9tJzogY3VyX3JlYyxcbiAgICAgICAgICAgICAgICAgICAgICAgICd0byc6IG5leHRfcmVjXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgICAgICB9LCBbXSk7XG5cbiAgICB9XG5cbiAgICBiZXR3ZWVuIChmcm9tX3RzLCB0b190cywgZ3JlZWR5LCBzdF9uYW1lKSB7XG5cbiAgICAgICAgbGV0IHN0YXRlcyA9IHRoaXMuX3N0YXRlcztcblxuICAgICAgICBpZiAoZ3JlZWR5ID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICBncmVlZHkgPSBmYWxzZTtcblxuICAgICAgICBsZXQgc3RfbmFtZXMgPSBzdF9uYW1lID09PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8gdGhpcy52YXJfbGlzdCgpXG4gICAgICAgICAgICA6IFtzdF9uYW1lXTtcblxuICAgICAgICBsZXQgY2hhbmdlcyA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHN0X25hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBsZXQgc3RhdGUgPSBzdGF0ZXNbc3RfbmFtZXNbaV1dO1xuICAgICAgICAgICAgbGV0IGl0ZXIgPSBzdGF0ZS51cHBlckJvdW5kKHt0aW1lc3RhbXA6IGZyb21fdHN9KTtcbiAgICAgICAgICAgIGxldCBjdXJfcmVjID0gaXRlci5wcmV2KCk7XG4gICAgICAgICAgICBpZiAoY3VyX3JlYyAhPT0gbnVsbCAmJiAoZ3JlZWR5IHx8IGN1cl9yZWMudGltZXN0YW1wID09PSBmcm9tX3RzKSlcbiAgICAgICAgICAgICAgICBjaGFuZ2VzLnB1c2goY3VyX3JlYyk7XG4gICAgICAgICAgICB3aGlsZSAoKGN1cl9yZWMgPSBpdGVyLm5leHQoKSkgJiYgY3VyX3JlYy50aW1lc3RhbXAgPD0gdG9fdHMpIHtcbiAgICAgICAgICAgICAgICBjaGFuZ2VzLnB1c2goY3VyX3JlYyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY2hhbmdlcy5zb3J0KHRlbXBvcmFsc3RhdGUuY2hhbmdlX2NtcCk7XG5cbiAgICB9XG5cbiAgICByZW1vdmVfdmFyICh2YXJfbmFtZSkge1xuXG4gICAgICAgIGxldCBzdGF0ZXMgPSB0aGlzLl9zdGF0ZXM7XG4gICAgICAgIGxldCBzdGF0ZSAgPSBzdGF0ZXNbdmFyX25hbWVdO1xuXG4gICAgICAgIGlmIChzdGF0ZSAmJiBzdGF0ZS5zaXplID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLmVtaXQoJ3JtX3ZhcicsIHZhcl9uYW1lKTtcbiAgICAgICAgICAgIGRlbGV0ZSBzdGF0ZXNbdmFyX25hbWVdO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmFsc2U7XG5cbiAgICB9XG5cbiAgICBfcHJpdl9hZGRfc3RhdGUgKHN0X25hbWUpIHtcblxuICAgICAgICB0aGlzLmVtaXQoJ25ld192YXInLCBzdF9uYW1lKTtcbiAgICAgICAgdGhpcy5fc3RhdGVzW3N0X25hbWVdID0gbmV3IGJpbnRyZWVzLlJCVHJlZSh0ZW1wb3JhbHN0YXRlLmNoYW5nZV9jbXApO1xuXG4gICAgfVxuXG4gICAgX3ByaXZfY2hhbmdlX2FkZCAoY2hhbmdlKSB7XG5cbiAgICAgICAgdGhpcy5lbWl0KCdhZGQnLCB7J3RpbWVzdGFtcCc6IGNoYW5nZS50aW1lc3RhbXAsICduYW1lJzogY2hhbmdlLm5hbWUsICd2YWwnOiBjaGFuZ2UudmFsfSk7XG4gICAgICAgIHRoaXMuX3N0YXRlc1tjaGFuZ2UubmFtZV0uaW5zZXJ0KGNoYW5nZSk7XG5cbiAgICB9XG5cbiAgICBfcHJpdl9jaGFuZ2VfcmVtb3ZlIChjaGFuZ2UpIHtcblxuICAgICAgICB0aGlzLmVtaXQoJ3JtJywgeyd0aW1lc3RhbXAnOiBjaGFuZ2UudGltZXN0YW1wLCAnbmFtZSc6IGNoYW5nZS5uYW1lLCAndmFsJzogY2hhbmdlLnZhbH0pO1xuICAgICAgICB0aGlzLl9zdGF0ZXNbY2hhbmdlLm5hbWVdLnJlbW92ZShjaGFuZ2UpO1xuXG4gICAgfVxuXG4gICAgX3ByaXZfY2hhbmdlX2NoYW5nZSAoY2hhbmdlLCBuZXdfdmFsKSB7XG5cbiAgICAgICAgbGV0IG9sZF92YWwgPSBjaGFuZ2UudmFsO1xuXG4gICAgICAgIHRoaXMuZW1pdCgnY2hhbmdlJywgeyd0aW1lc3RhbXAnOiBjaGFuZ2UudGltZXN0YW1wLCAnbmFtZSc6IGNoYW5nZS5uYW1lLCAndmFsJzogb2xkX3ZhbH0sIG5ld192YWwpO1xuICAgICAgICBjaGFuZ2UudmFsID0gbmV3X3ZhbDtcblxuICAgIH1cblxuICAgIHN0YXRpYyBjaGFuZ2VfY21wIChhLCBiKSB7XG5cbiAgICAgICAgcmV0dXJuIGEudGltZXN0YW1wIDwgYi50aW1lc3RhbXAgPyAtMVxuICAgICAgICAgICAgOiBhLnRpbWVzdGFtcCA+IGIudGltZXN0YW1wID8gMVxuICAgICAgICAgICAgOiBhLm5hbWUgPCBiLm5hbWUgPyAtMVxuICAgICAgICAgICAgOiBhLm5hbWUgPiBiLm5hbWUgPyAxXG4gICAgICAgICAgICA6IDA7XG5cbiAgICB9XG5cbiAgICBzdGF0aWMgY2hhbmdlX3ZhbGVxZiAoYSwgYikge1xuXG4gICAgICAgIHJldHVybiBhID09PSBiO1xuXG4gICAgfVxuXG59XG5cblxuZXhwb3J0IGRlZmF1bHQgdGVtcG9yYWxzdGF0ZTtcbiJdfQ==
//# sourceMappingURL=temporalstate_es5.js.map
