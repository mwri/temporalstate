import chai_jasmine from 'chai-jasmine';
import temporalstate from './../lib/temporalstate.js';
import bintrees from 'bintrees';


describe('temporalstate', () => {

    describe('integration', () => {

        it('bintrees behaves as expected', () => {
            let tree = new bintrees.RBTree(function (a, b) { return a - b; });
            expect(tree.size).to.eql(0);
            expect(tree.insert(5)).to.eql(true);
            expect(tree.insert(5)).to.eql(false);
            expect(tree.size).to.eql(1);
            expect(tree.insert(10)).to.eql(true);
            expect(tree.insert(15)).to.eql(true);
            expect(tree.insert(40)).to.eql(true);
            expect(tree.size).to.eql(4);
            expect(tree.find(5)).to.eql(5);
            expect(tree.find(4)).to.eql(null);
            expect(tree.find(6)).to.eql(null);
            expect(tree.find(10)).to.eql(10);
            expect(tree.find(15)).to.eql(15);
            expect(tree.find(40)).to.eql(40);
            expect(tree.find(50)).to.eql(null);
            let i1 = tree.iterator();
            expect(i1.data()).to.eql(null);
            expect(i1.next()).to.eql(5);
            expect(i1.data()).to.eql(5);
            expect(i1.next()).to.eql(10);
            expect(i1.data()).to.eql(10);
            expect(i1.next()).to.eql(15);
            expect(i1.data()).to.eql(15);
            expect(i1.next()).to.eql(40);
            expect(i1.data()).to.eql(40);
            expect(i1.next()).to.eql(null);
            expect(i1.data()).to.eql(null);
            expect(i1.next()).to.eql(5);
            expect(i1.data()).to.eql(5);
            expect(i1.prev()).to.eql(null);
            expect(i1.data()).to.eql(null);
            expect(i1.prev()).to.eql(40);
            expect(i1.data()).to.eql(40);
            let i2 = tree.lowerBound(8);
            expect(i2.data()).to.eql(10);
            expect(i2.next()).to.eql(15);
            expect(i2.data()).to.eql(15);
            expect(i2.next()).to.eql(40);
            expect(i2.data()).to.eql(40);
            let i3 = tree.lowerBound(10);
            expect(i3.data()).to.eql(10);
            let i4 = tree.upperBound(10);
            expect(i4.data()).to.eql(15);
            expect(i4.next()).to.eql(40);
            expect(i4.data()).to.eql(40);
            expect(i4.next()).to.eql(null);
            expect(i4.data()).to.eql(null);
            let i5 = tree.upperBound(3);
            expect(i5.data()).to.eql(5);
            expect(i5.prev()).to.eql(null);
            let i6 = tree.iterator();
            expect(i6.data()).to.eql(null);
            expect(i6.prev()).to.eql(40);
            expect(i6.data()).to.eql(40);
            expect(i6.prev()).to.eql(15);
        });

    });

    describe('static', () => {

        describe('cmp_change', () => {

            (function (test_formats) {
                for (let test_format in test_formats) {
                    let format_convert_f = test_formats[test_format];
                    describe('time as '+test_format, () => {
                        (function (tests) {
                            for (let test_descr in tests) {
                                let test = tests[test_descr];
                                let a = test.a;
                                let b = test.b;
                                a.timestamp = format_convert_f(a.timestamp);
                                b.timestamp = format_convert_f(b.timestamp);
                                let a_descr = '{timestamp:'+a.timestamp+',name:'+a.name+',val:'+a.val+'}';
                                let b_descr = '{timestamp:'+b.timestamp+',name:'+b.name+',val:'+b.val+'}';
                                test_descr = test.d
                                    .replace('${a}', a_descr)
                                    .replace('${b}', b_descr)
                                    .replace(/ /g, '');
                                it(test_descr, function () {
                                    expect(test.f(temporalstate.change_cmp(a, b))).toBe(true);
                                });
                            }
                        })({
                            'sort (a, b) < 0 when a timestamp < b timestamp, a name < b name': {
                                'a': {'timestamp': 9, 'name': 'nd', 'val': 'vd'},
                                'b': {'timestamp': 10, 'name': 'ne', 'val': 've'},
                                'f': (r) => r < 0,
                                'd': 'sort(${a},${b}) < 0',
                            },
                            'sort (a, b) < 0 when a timestamp < b timestamp, a name > b name': {
                                'a': {'timestamp': 9, 'name': 'nd', 'val': 'vd'},
                                'b': {'timestamp': 11, 'name': 'nc', 'val': 'vc'},
                                'f': (r) => r < 0,
                                'd': 'sort(${a},${b}) < 0',
                            },
                            'sort (a, b) > 0 when a timestamp > b timestamp, a name < b name': {
                                'a': {'timestamp': 9, 'name': 'nd', 'val': 'vd'},
                                'b': {'timestamp': 8, 'name': 'ne', 'val': 've'},
                                'f': (r) => r > 0,
                                'd': 'sort(${a},${b}) > 0',
                            },
                            'sort (a, b) > 0 when a timestamp > b timestamp, a name > b name': {
                                'a': {'timestamp': 9, 'name': 'nd', 'val': 'vd'},
                                'b': {'timestamp': 7, 'name': 'nc', 'val': 'vc'},
                                'f': (r) => r > 0,
                                'd': 'sort(${a},${b}) > 0',
                            },
                            'sort (a, b) < 0 when a timestamp = b timestamp, a name < b name': {
                                'a': {'timestamp': 9, 'name': 'nd', 'val': 'vd'},
                                'b': {'timestamp': 9, 'name': 'ne', 'val': 've'},
                                'f': (r) => r < 0,
                                'd': 'sort(${a},${b}) < 0',
                            },
                            'sort (a, b) > 0 when a timestamp = b timestamp, a name > b name': {
                                'a': {'timestamp': 9, 'name': 'nd', 'val': 'vd'},
                                'b': {'timestamp': 9, 'name': 'nc', 'val': 'vc'},
                                'f': (r) => r > 0,
                                'd': 'sort(${a},${b}) > 0',
                            },
                            'sort (a, b) = 0 when a timestamp = b timestamp, a name = b name': {
                                'a': {'timestamp': 9, 'name': 'nd', 'val': 'vd'},
                                'b': {'timestamp': 9, 'name': 'nd', 'val': 'vd'},
                                'f': (r) => r === 0,
                                'd': 'sort(${a},${b}) = 0',
                            },
                        });
                    });
                }
            })({
                'integer': (int_val) => {
                    return int_val;
                },
                'float': (int_val) => {
                    return int_val * Math.PI;
                },
                'string': (int_val) => {
                    return String.fromCharCode(97+int_val);
                },
                'Date()': (int_val) => {
                    let timedate = new Date();
                    timedate.setSeconds(timedate.getSeconds()+(int_val*10));
                    return timedate;
                },
            });

        });

    });

    describe('constructor', () => {

        it('does not fail', () => {
            let db = new temporalstate();
        });

        describe('initial object state', () => {

            beforeEach(function () {
                this.db = new temporalstate();
            });

            it('has empty change list', function () {
                expect(this.db.change_list()).to.be.an('array').is.lengthOf(0);
            });

        });

    });

    describe('add_change (using change_list)', () => {

        beforeEach(function () {
            this.db = new temporalstate();
        });

        it('adds changes to change list', function () {
            let db = this.db;
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(0);
            // add change
            db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(1)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
            // add change changing existing state
            db.add_change({'timestamp': 20, 'name': 'weather', 'val': 'sunny'});
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(2)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'})
                .to.include({'timestamp': 20, 'name': 'weather', 'val': 'sunny'});
            // add change changing different, non existing state
            db.add_change({'timestamp': 30, 'name': 'moon', 'val': 'full'});
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(3)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'})
                .to.include({'timestamp': 20, 'name': 'weather', 'val': 'sunny'})
                .to.include({'timestamp': 30, 'name': 'moon', 'val': 'full'});
        });

        it('does not add change list when change name, time and value are duplicates', function () {
            let db = this.db;
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(0);
            db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(1)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
            db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(1)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
        });

        it('updates change list when change timestamp and name already exists but value changes (first of many changes)', function () {
            let db = this.db;
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(0);
            db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
            db.add_change({'timestamp': 20, 'name': 'weather', 'val': 'foggy'});
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(2)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'})
                .to.include({'timestamp': 20, 'name': 'weather', 'val': 'foggy'});
            db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'sunny'});
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(2)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'sunny'})
                .to.include({'timestamp': 20, 'name': 'weather', 'val': 'foggy'});
        });

        it('updates change list when change timestamp and name already exists but value changes (not first change)', function () {
            let db = this.db;
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(0);
            db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
            db.add_change({'timestamp': 20, 'name': 'weather', 'val': 'foggy'});
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(2)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'})
                .to.include({'timestamp': 20, 'name': 'weather', 'val': 'foggy'});
            db.add_change({'timestamp': 20, 'name': 'weather', 'val': 'depressing'});
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(2)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'})
                .to.include({'timestamp': 20, 'name': 'weather', 'val': 'depressing'});
        });

        it('updates change list when change timestamp and name already exists but value changes (first and only change)', function () {
            let db = this.db;
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(0);
            db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(1)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
            db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'sunny'});
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(1)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'sunny'});
        });

        it('non state changing changes are optimised away (no change after final update)', function () {
            let db = this.db;
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(0);
            db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(1)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
            db.add_change({'timestamp': 20, 'name': 'weather', 'val': 'raining'});
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(1)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
        });

        it('proceeding redundant changes are optimised away (change before first update)', function () {
            let db = this.db;
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(0);
            db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(1)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
            db.add_change({'timestamp': 5, 'name': 'weather', 'val': 'raining'});
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(1)
                .to.include({'timestamp': 5, 'name': 'weather', 'val': 'raining'});
        });

        it('redundant changes that make another change redundant are optimised (ABA reduces to A)', function () {
            let db = this.db;
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(0);
            db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
            db.add_change({'timestamp': 20, 'name': 'weather', 'val': 'sunny'});
            db.add_change({'timestamp': 30, 'name': 'weather', 'val': 'raining'});
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(3)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'})
                .to.include({'timestamp': 20, 'name': 'weather', 'val': 'sunny'})
                .to.include({'timestamp': 30, 'name': 'weather', 'val': 'raining'});
            db.add_change({'timestamp': 20, 'name': 'weather', 'val': 'raining'});
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(1)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
        });

        it('redundant changes that make another change redundant are optimised (BA reduces to A)', function () {
            let db = this.db;
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(0);
            db.add_change({'timestamp': 20, 'name': 'weather', 'val': 'sunny'});
            db.add_change({'timestamp': 30, 'name': 'weather', 'val': 'raining'});
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(2)
                .to.include({'timestamp': 20, 'name': 'weather', 'val': 'sunny'})
                .to.include({'timestamp': 30, 'name': 'weather', 'val': 'raining'});
            db.add_change({'timestamp': 20, 'name': 'weather', 'val': 'raining'});
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(1)
                .to.include({'timestamp': 20, 'name': 'weather', 'val': 'raining'});
        });

        it('redundant changes that make another change redundant are optimised (ABC reduces to AC)', function () {
            let db = this.db;
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(0);
            db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
            db.add_change({'timestamp': 20, 'name': 'weather', 'val': 'sunny'});
            db.add_change({'timestamp': 30, 'name': 'weather', 'val': 'foggy'});
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(3)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'})
                .to.include({'timestamp': 20, 'name': 'weather', 'val': 'sunny'})
                .to.include({'timestamp': 30, 'name': 'weather', 'val': 'foggy'});
            db.add_change({'timestamp': 20, 'name': 'weather', 'val': 'raining'});
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(2)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'})
                .to.include({'timestamp': 30, 'name': 'weather', 'val': 'foggy'});
        });

        it('a null state can be set like any other state value', function () {
            let db = this.db;
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(0);
            db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
            db.add_change({'timestamp': 20, 'name': 'weather', 'val': null});
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(2)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'})
                .to.include({'timestamp': 20, 'name': 'weather', 'val': null});
            expect(db.state(15, 'weather')).to.eql('raining');
            expect(db.state(25, 'weather')).to.eql(null);
        });

        it('a null state can delete the last state value, leaving no changes', function () {
            let db = this.db;
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(0);
            db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(1)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
            db.add_change({'timestamp': 10, 'name': 'weather', 'val': null});
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(0);
        });

        it('a null state before other states is redundant', function () {
            let db = this.db;
            db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(1)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
            db.add_change({'timestamp': 9, 'name': 'weather', 'val': null});
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(1)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
        });

        it('a change to a value before a change to the same value eliminates the prior change', function () {
            let db = this.db;
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(0);
            db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
            db.add_change({'timestamp': 20, 'name': 'weather', 'val': 'sunny'});
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(2)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'})
                .to.include({'timestamp': 20, 'name': 'weather', 'val': 'sunny'});
            db.add_change({'timestamp': 15, 'name': 'weather', 'val': 'sunny'});
            expect(db.change_list())
                .to.be.an('array')
                .is.lengthOf(2)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'})
                .to.include({'timestamp': 15, 'name': 'weather', 'val': 'sunny'});
        });

    });

    describe('change_list', () => {

        beforeEach(function () {
            this.db = new temporalstate();
        });

        (function (tests) {
            for (let test_descr in tests) {
                it('is ordered ('+test_descr+')', function () {
                    let test = tests[test_descr];
                    let db = this.db;
                    test.forEach((c) => { db.add_change(c); });
                    let ts_ordered_cl = test.slice().sort(temporalstate.change_cmp);
                    expect(db.change_list())
                        .to.be.an('array')
                        .is.lengthOf(test.length)
                        .toEqual(ts_ordered_cl);
                });
            }
        })({
            'single change name': [
                {'timestamp': 10, 'name': 'weather', 'val': 'raining'},
                {'timestamp': 30, 'name': 'weather', 'val': 'foggy'},
                {'timestamp': 20, 'name': 'weather', 'val': 'sunny'},
            ],
            'multiple change names': [
                {'timestamp': 10, 'name': 'weather', 'val': 'raining'},
                {'timestamp': 15, 'name': 'moon', 'val': 'full'},
                {'timestamp': 50, 'name': 'moon', 'val': 'super'},
                {'timestamp': 40, 'name': 'weather', 'val': 'foggy'},
                {'timestamp': 30, 'name': 'moon', 'val': 'ecclipsed'},
                {'timestamp': 20, 'name': 'weather', 'val': 'sunny'},
            ],
            'multiple change names with duplicate timestamps': [
                {'timestamp': 10, 'name': 'weather', 'val': 'raining'},
                {'timestamp': 15, 'name': 'moon', 'val': 'full'},
                {'timestamp': 50, 'name': 'moon', 'val': 'super'},
                {'timestamp': 15, 'name': 'weather', 'val': 'foggy'},
                {'timestamp': 30, 'name': 'moon', 'val': 'ecclipsed'},
                {'timestamp': 20, 'name': 'weather', 'val': 'sunny'},
            ],
        });

    });

    describe('var_list', () => {

        beforeEach(function () {
            let db = new temporalstate();
            this.db = db;
        });

        it('returns a list of known variable names', function () {
            let db = this.db;
            expect(db.var_list())
                .to.be.an('array')
                .is.lengthOf(0);
            db.add_change({'timestamp': 10, 'name': 'foo', 'val': 'fooval1'});
            expect(db.var_list())
                .to.be.an('array')
                .is.lengthOf(1)
                .to.include('foo');
            db.add_change({'timestamp': 20, 'name': 'foo', 'val': 'fooval2'});
            expect(db.var_list())
                .to.be.an('array')
                .is.lengthOf(1)
                .to.include('foo');
            db.add_change({'timestamp': 15, 'name': 'bar', 'val': 'varval1'});
            expect(db.var_list())
                .to.be.an('array')
                .is.lengthOf(2)
                .to.include('foo')
                .to.include('bar');
        });

    });

    describe('remove_change', () => {

        beforeEach(function () {
            let db = new temporalstate();
            for (let change of [
                {'timestamp': 10, 'name': 'weather', 'val': 'raining'},
                {'timestamp': 20, 'name': 'weather', 'val': 'sunny'},
                {'timestamp': 25, 'name': 'sun', 'val': 'spotty'},
            ]) {
                db.add_change(change);
            }
            this.db = db;
        });

        it('removes an existing change', function () {
            let db = this.db;
            expect(db.change_list()).to.be.an('array').is.length(3);
            db.remove_change({'timestamp': 20, 'name': 'weather', 'val': 'foggy'});
            expect(db.change_list()).to.be.an('array').is.length(3);
            db.remove_change({'timestamp': 20, 'name': 'sun', 'val': 'sunny'});
            expect(db.change_list()).to.be.an('array').is.length(3);
            db.remove_change({'timestamp': 10, 'name': 'weather', 'val': 'sunny'});
            expect(db.change_list()).to.be.an('array').is.length(3);
            db.remove_change({'timestamp': 20, 'name': 'unknown', 'val': 'sunny'});
            expect(db.change_list()).to.be.an('array').is.length(3);
        });

        it('does nothing for a non existing change', function () {
            let db = this.db;
            expect(db.change_list())
                .to.be.an('array')
                .is.length(3);
            db.remove_change({'timestamp': 20, 'name': 'weather', 'val': 'sunny'});
            expect(db.change_list())
                .to.be.an('array')
                .is.length(2)
                .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'})
                .to.include({'timestamp': 25, 'name': 'sun', 'val': 'spotty'});
            db.remove_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
            expect(db.change_list())
                .to.be.an('array')
                .is.length(1)
                .to.include({'timestamp': 25, 'name': 'sun', 'val': 'spotty'});
            db.remove_change({'timestamp': 25, 'name': 'sun', 'val': 'spotty'});
            expect(db.change_list())
                .to.be.an('array')
                .is.length(0);
        });

    });

    describe('stepping', () => {

        beforeEach(function () {
            let db = new temporalstate();
            for (let change of [
                {'timestamp': 10, 'name': 'weather', 'val': 'raining'},
                {'timestamp': 20, 'name': 'weather', 'val': 'sunny'},
                {'timestamp': 25, 'name': 'sun', 'val': 'spotty'},
                {'timestamp': 30, 'name': 'moon', 'val': 'ecclipsed'},
                {'timestamp': 30, 'name': 'weather', 'val': 'foggy'},
                {'timestamp': 50, 'name': 'moon', 'val': 'super'},
            ]) {
                db.add_change(change);
            }
            this.db = db;
        });

        describe('first', () => {

            it('returns null when there are no changes', function () {
                let db = new temporalstate();
                expect(db.first()).to.eql(null);
            });

            it('returns the first change (singular result)', function () {
                let db = this.db;
                expect(db.first())
                    .to.eql([{'timestamp': 10, 'name': 'weather', 'val': 'raining'}]);
            });

            it('returns the first change (multiple result)', function () {
                let db = this.db;
                db.add_change({'timestamp': 10, 'name': 'sun', 'val': 'exploding'});
                expect(db.first())
                    .to.eql([
                        {'timestamp': 10, 'name': 'sun', 'val': 'exploding'},
                        {'timestamp': 10, 'name': 'weather', 'val': 'raining'},
                    ]);
            });

        });

        describe('last', () => {

            it('returns null when there are no changes', function () {
                let db = new temporalstate();
                expect(db.last()).to.eql(null);
            });

            it('returns the last change (singular result)', function () {
                let db = this.db;
                expect(db.last())
                    .to.eql([{'timestamp': 50, 'name': 'moon', 'val': 'super'}]);
            });

            it('returns the last change (multiple result)', function () {
                let db = this.db;
                db.add_change({'timestamp': 50, 'name': 'sun', 'val': 'ecclipsed'});
                expect(db.last())
                    .to.eql([
                        {'timestamp': 50, 'name': 'moon', 'val': 'super'},
                        {'timestamp': 50, 'name': 'sun', 'val': 'ecclipsed'},
                    ]);
            });

        });

        describe('next (no var specified)', () => {

            it('finds the next change (singular result)', function () {
                let db = this.db;
                expect(db.next({'timestamp': 10, 'name': 'weather', 'val': 'raining'}))
                    .to.be.an('array')
                    .to.eql([{'timestamp': 20, 'name': 'weather', 'val': 'sunny'}]);
                expect(db.next({'timestamp': 20, 'name': 'weather', 'val': 'sunny'}))
                    .to.be.an('array')
                    .to.eql([{'timestamp': 25, 'name': 'sun', 'val': 'spotty'}]);
            });

            it('finds the next change (multiple result)', function () {
                let db = this.db;
                expect(db.next({'timestamp': 25, 'name': 'sun', 'val': 'spotty'}))
                    .to.be.an('array')
                    .to.eql([
                        {'timestamp': 30, 'name': 'moon', 'val': 'ecclipsed'},
                        {'timestamp': 30, 'name': 'weather', 'val': 'foggy'},
                    ]);
            });

            it('finds the next change at a later time when multiple changes at the current time', function () {
                let db = this.db;
                expect(db.next({'timestamp': 30, 'name': 'moon', 'val': 'ecclipsed'}))
                    .to.be.an('array')
                    .to.eql([{'timestamp': 50, 'name': 'moon', 'val': 'super'}]);
                expect(db.next({'timestamp': 30, 'name': 'weather', 'val': 'foggy'}))
                    .to.be.an('array')
                    .to.eql([{'timestamp': 50, 'name': 'moon', 'val': 'super'}]);
            });

            it('returns null when the current change is last', function () {
                let db = this.db;
                expect(db.next({'timestamp': 50, 'name': 'moon', 'val': 'super'}))
                    .to.be.an('null');
            });

        });

        describe('next (var specified)', () => {

            it('finds the next change (target change is next)', function () {
                let db = this.db;
                expect(db.next({'timestamp': 10, 'name': 'weather', 'val': 'raining'}, 'weather'))
                    .to.be.an('object')
                    .to.eql({'timestamp': 20, 'name': 'weather', 'val': 'sunny'});
            });

            it('finds the next change (target change is not next)', function () {
                let db = this.db;
                expect(db.next({'timestamp': 20, 'name': 'weather', 'val': 'raining'}, 'weather'))
                    .to.be.an('object')
                    .to.eql({'timestamp': 30, 'name': 'weather', 'val': 'foggy'});
            });

            it('returns null when the current change is last (absolute)', function () {
                let db = this.db;
                expect(db.next({'timestamp': 50, 'name': 'moon', 'val': 'super'}, 'moon'))
                    .to.be.an('null');
            });

            it('returns null when the current change is last (for the var)', function () {
                let db = this.db;
                expect(db.next({'timestamp': 30, 'name': 'weather', 'val': 'foggy'}, 'weather'))
                    .to.be.an('null');
            });

            it('returns null when the var is unknown', function () {
                let db = this.db;
                expect(db.next({'timestamp': 20, 'name': 'weather', 'val': 'raining'}, 'unknown'))
                    .to.be.an('null');
            });

        });

        describe('prev (no var specified)', () => {

            it('finds the previous change (singular result)', function () {
                let db = this.db;
                expect(db.prev({'timestamp': 25, 'name': 'sun', 'val': 'spotty'}))
                    .to.be.an('array')
                    .to.eql([{'timestamp': 20, 'name': 'weather', 'val': 'sunny'}]);
                expect(db.prev({'timestamp': 20, 'name': 'weather', 'val': 'sunny'}))
                    .to.be.an('array')
                    .to.eql([{'timestamp': 10, 'name': 'weather', 'val': 'raining'}]);
            });

            it('finds the previous change (multiple result)', function () {
                let db = this.db;
                expect(db.prev({'timestamp': 50, 'name': 'moon', 'val': 'super'}))
                    .to.be.an('array')
                    .to.eql([
                        {'timestamp': 30, 'name': 'moon', 'val': 'ecclipsed'},
                        {'timestamp': 30, 'name': 'weather', 'val': 'foggy'},
                    ]);
            });

            it('finds the previous change at an earlier time when multiple changes at the current time', function () {
                let db = this.db;
                expect(db.prev({'timestamp': 30, 'name': 'moon', 'val': 'ecclipsed'}))
                    .to.be.an('array')
                    .to.eql([{'timestamp': 25, 'name': 'sun', 'val': 'spotty'}]);
                expect(db.prev({'timestamp': 30, 'name': 'weather', 'val': 'foggy'}))
                    .to.be.an('array')
                    .to.eql([{'timestamp': 25, 'name': 'sun', 'val': 'spotty'}]);
            });

            it('returns null when the current change is first', function () {
                let db = this.db;
                expect(db.prev({'timestamp': 10, 'name': 'weather', 'val': 'raining'}))
                    .to.be.an('null');
            });

        });

        describe('prev (var specified)', () => {

            it('finds the previous change (target change is previous)', function () {
                let db = this.db;
                expect(db.prev({'timestamp': 20, 'name': 'weather', 'val': 'sunny'}, 'weather'))
                    .to.be.an('object')
                    .to.eql({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
            });

            it('finds the previous change (target change is not previous)', function () {
                let db = this.db;
                expect(db.prev({'timestamp': 30, 'name': 'weather', 'val': 'foggy'}, 'weather'))
                    .to.be.an('object')
                    .to.eql({'timestamp': 20, 'name': 'weather', 'val': 'sunny'});
            });

            it('returns null when the current change is first (absolute)', function () {
                let db = this.db;
                expect(db.prev({'timestamp': 10, 'name': 'weather', 'val': 'raining'}, 'weather'))
                    .to.be.an('null');
            });

            it('returns null when the current change is first (for the var)', function () {
                let db = this.db;
                expect(db.prev({'timestamp': 25, 'name': 'sun', 'val': 'spotty'}, 'sun'))
                    .to.be.an('null');
            });

            it('returns null when the var is unknown', function () {
                let db = this.db;
                expect(db.prev({'timestamp': 30, 'name': 'weather', 'val': 'foggy'}, 'unknown'))
                    .to.be.an('null');
            });

        });

        describe('at', () => {

            it('finds the change at the exact time (singular result)', function () {
                let db = this.db;
                expect(db.at(10)).to.eql([{'timestamp': 10, 'name': 'weather', 'val': 'raining'}]);
            });

            it('finds the change at the exact time (multiple result)', function () {
                let db = this.db;
                expect(db.at(30)).to.eql([
                    {'timestamp': 30, 'name': 'moon', 'val': 'ecclipsed'},
                    {'timestamp': 30, 'name': 'weather', 'val': 'foggy'},
                ]);
            });

            it('returns an empty list when there is no change at the specified time', function () {
                let db = this.db;
                expect(db.at(1)).to.eql([]);
                expect(db.at(11)).to.eql([]);
                expect(db.at(111)).to.eql([]);
            });

        });

        describe('after', () => {

            it('returns null when there are no changes', function () {
                let db = new temporalstate();
                expect(db.after(15)).to.eql(null);
            });

            it('returns null when there are no changes after the passed timestamp', function () {
                let db = this.db;
                expect(db.after(60)).to.eql(null);
                expect(db.after(70)).to.eql(null);
            });

            it('returns the first change after the passed time stamp (first change)', function () {
                let db = this.db;
                expect(db.after(5))
                    .to.eql([{'timestamp': 10, 'name': 'weather', 'val': 'raining'}]);
            });

            it('returns the first change after the passed time stamp (single result)', function () {
                let db = this.db;
                expect(db.after(15))
                    .to.eql([{'timestamp': 20, 'name': 'weather', 'val': 'sunny'}]);
            });

            it('returns the first change after the passed time stamp (timestamp matches existing change)', function () {
                let db = this.db;
                expect(db.after(10))
                    .to.eql([{'timestamp': 20, 'name': 'weather', 'val': 'sunny'}]);
            });

            it('returns the first change after the passed time stamp (multiple result)', function () {
                let db = this.db;
                expect(db.after(27))
                    .to.eql([
                        {'timestamp': 30, 'name': 'moon', 'val': 'ecclipsed'},
                        {'timestamp': 30, 'name': 'weather', 'val': 'foggy'},
                    ]);
            });

        });

        describe('before', () => {

            it('returns null when there are no changes', function () {
                let db = new temporalstate();
                expect(db.before()).to.eql(null);
            });

            it('returns null when there are no changes before the passed time stamp', function () {
                let db = this.db;
                expect(db.before(0)).to.eql(null);
                expect(db.before(5)).to.eql(null);
            });

            it('returns the last change before the passed time stamp (last change)', function () {
                let db = this.db;
                expect(db.before(60))
                    .to.eql([{'timestamp': 50, 'name': 'moon', 'val': 'super'}]);
                expect(db.before(70))
                    .to.eql([{'timestamp': 50, 'name': 'moon', 'val': 'super'}]);
            });

            it('returns the last change before the last timestamp (singular result)', function () {
                let db = this.db;
                expect(db.before(23))
                    .to.eql([{'timestamp': 20, 'name': 'weather', 'val': 'sunny'}]);
            });

            it('returns the last change before the passed time stamp (timestamp matches existing change)', function () {
                let db = this.db;
                expect(db.before(20))
                    .to.eql([{'timestamp': 10, 'name': 'weather', 'val': 'raining'}]);
            });

            it('returns the last change before the last timestamp (multiple result)', function () {
                let db = this.db;
                expect(db.before(40))
                    .to.eql([
                        {'timestamp': 30, 'name': 'moon', 'val': 'ecclipsed'},
                        {'timestamp': 30, 'name': 'weather', 'val': 'foggy'},
                    ]);
            });

        });

        describe('between', () => {

            it('returns an empty list when there are no changes', function () {
                let db = new temporalstate();
                expect(db.between(0, 100)).to.eql([]);
                expect(db.between(10, 20)).to.eql([]);
                expect(db.between(15, 60)).to.eql([]);
            });

            it('returns changes within the time frame', function () {
                let db = this.db;
                expect(db.between(15, 28))
                    .to.be.an('array')
                    .is.lengthOf(2)
                    .to.include({'timestamp': 20, 'name': 'weather', 'val': 'sunny'})
                    .to.include({'timestamp': 25, 'name': 'sun', 'val': 'spotty'});
                expect(db.between(27, 60))
                    .to.be.an('array')
                    .is.lengthOf(3)
                    .to.include({'timestamp': 30, 'name': 'moon', 'val': 'ecclipsed'})
                    .to.include({'timestamp': 30, 'name': 'weather', 'val': 'foggy'})
                    .to.include({'timestamp': 50, 'name': 'moon', 'val': 'super'});
            });

            it('includes changes at the boundaries', function () {
                let db = this.db;
                expect(db.between(20,27))
                    .to.be.an('array')
                    .is.lengthOf(2)
                    .to.include({'timestamp': 20, 'name': 'weather', 'val': 'sunny'})
                    .to.include({'timestamp': 25, 'name': 'sun', 'val': 'spotty'});
                expect(db.between(27, 50))
                    .to.be.an('array')
                    .is.lengthOf(3)
                    .to.include({'timestamp': 30, 'name': 'moon', 'val': 'ecclipsed'})
                    .to.include({'timestamp': 30, 'name': 'weather', 'val': 'foggy'})
                    .to.include({'timestamp': 50, 'name': 'moon', 'val': 'super'});
            });

            it('returns previously in effect states when greedy specified', function () {
                let db = this.db;
                expect(db.between(15, 28, true))
                    .to.be.an('array')
                    .is.lengthOf(3)
                    .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'})
                    .to.include({'timestamp': 20, 'name': 'weather', 'val': 'sunny'})
                    .to.include({'timestamp': 25, 'name': 'sun', 'val': 'spotty'});
                expect(db.between(27, 60, true))
                    .to.be.an('array')
                    .is.lengthOf(5)
                    .to.include({'timestamp': 20, 'name': 'weather', 'val': 'sunny'})
                    .to.include({'timestamp': 25, 'name': 'sun', 'val': 'spotty'})
                    .to.include({'timestamp': 30, 'name': 'moon', 'val': 'ecclipsed'})
                    .to.include({'timestamp': 30, 'name': 'weather', 'val': 'foggy'})
                    .to.include({'timestamp': 50, 'name': 'moon', 'val': 'super'});
            });

            it('returns no previous in effect states prior to states at the start boundary', function () {
                let db = this.db;
                expect(db.between(20, 28, true))
                    .to.be.an('array')
                    .is.lengthOf(2)
                    .to.include({'timestamp': 20, 'name': 'weather', 'val': 'sunny'})
                    .to.include({'timestamp': 25, 'name': 'sun', 'val': 'spotty'});
                expect(db.between(30, 60, true))
                    .to.be.an('array')
                    .is.lengthOf(4)
                    .to.include({'timestamp': 25, 'name': 'sun', 'val': 'spotty'})
                    .to.include({'timestamp': 30, 'name': 'moon', 'val': 'ecclipsed'})
                    .to.include({'timestamp': 30, 'name': 'weather', 'val': 'foggy'})
                    .to.include({'timestamp': 50, 'name': 'moon', 'val': 'super'});
            });

            it('returns only the specified state if specified', function () {
                let db = this.db;
                expect(db.between(15, 40, false, 'weather'))
                    .to.be.an('array')
                    .is.lengthOf(2)
                    .to.include({'timestamp': 20, 'name': 'weather', 'val': 'sunny'})
                    .to.include({'timestamp': 30, 'name': 'weather', 'val': 'foggy'});
            });

        });

    });

    describe('state derivation', () => {

        beforeEach(function () {
            let db = new temporalstate();
            for (let change of [
                {'timestamp': 10, 'name': 'weather', 'val': 'raining'},
                {'timestamp': 15, 'name': 'moon', 'val': 'full'},
                {'timestamp': 50, 'name': 'moon', 'val': 'super'},
                {'timestamp': 25, 'name': 'sun', 'val': 'spotty'},
                {'timestamp': 30, 'name': 'moon', 'val': 'ecclipsed'},
                {'timestamp': 20, 'name': 'weather', 'val': 'sunny'},
                {'timestamp': 30, 'name': 'weather', 'val': 'foggy'},
            ]) {
                db.add_change(change);
            }
            this.db = db;
        });

        describe('state', () => {

            it('is empty before first change (specified state)', function () {
                let db = this.db;
                expect(db.state(0, 'weather'))
                    .to.be.an('null');
                expect(db.state(1, 'moon'))
                    .to.be.an('null');
            });

            it('is empty before first change (specified non existing state)', function () {
                let db = this.db;
                expect(db.state(0, 'missing'))
                    .to.be.an('null');
            });

            it('is empty before first change (all states)', function () {
                let db = this.db;
                expect(db.state(0))
                    .to.be.an('object')
                    .to.eql({});
                expect(db.state(1))
                    .to.be.an('object')
                    .to.eql({});
            });

            it('reflects first change at first change (specified state)', function () {
                let db = this.db;
                expect(db.state(10, 'weather'))
                    .to.be.an('string')
                    .to.eql('raining');
            });

            it('is empty at first change (specified non existing state)', function () {
                let db = this.db;
                expect(db.state(10, '404'))
                    .to.be.an('null');
            });

            it('is empty at first change (specified different state)', function () {
                let db = this.db;
                expect(db.state(10, 'moon'))
                    .to.be.an('null');
            });

            it('reflects first change after first change (specified state)', function () {
                let db = this.db;
                expect(db.state(11, 'weather'))
                    .to.be.an('string')
                    .to.eql('raining');
            });

            it('is empty after first change (specified non existing state)', function () {
                let db = this.db;
                expect(db.state(11, '404'))
                    .to.be.an('null');
            });

            it('is empty after first change (specified different state)', function () {
                let db = this.db;
                expect(db.state(11, 'moon'))
                    .to.be.an('null');
            });

            it('reflects first change at first change (all states)', function () {
                let db = this.db;
                expect(db.state(10))
                    .to.be.an('object')
                    .to.eql({'weather': 'raining'});
            });

            it('reflects first change after first change (all states)', function () {
                let db = this.db;
                expect(db.state(11))
                    .to.be.an('object')
                    .to.eql({'weather': 'raining'});
            });

            it('reflects first and second change at second change', function () {
                let db = this.db;
                expect(db.state(15))
                    .to.be.an('object')
                    .to.eql({'moon': 'full', 'weather': 'raining'});
            });

            it('reflects first and second change after second change', function () {
                let db = this.db;
                expect(db.state(17))
                    .to.be.an('object')
                    .to.eql({'moon': 'full', 'weather': 'raining'});
            });

            it('new changes of state replace previous changes at new change (specified state)', function () {
                let db = this.db;
                expect(db.state(20, 'weather'))
                    .to.be.an('string')
                    .to.eql('sunny');
            });

            it('new changes of state replace previous changes after new change (all states)', function () {
                let db = this.db;
                expect(db.state(21))
                    .to.be.an('object')
                    .to.eql({'moon': 'full', 'weather': 'sunny'});
            });

            it('all the latest state changes prevail at last change (specific state)', function () {
                let db = this.db;
                expect(db.state(50, 'weather'))
                    .to.be.an('string')
                    .to.eql('foggy');
                expect(db.state(50, 'sun'))
                    .to.be.an('string')
                    .to.eql('spotty');
                expect(db.state(50, 'moon'))
                    .to.be.an('string')
                    .to.eql('super');
            });

            it('all the latest state changes prevail at last change (all states)', function () {
                let db = this.db;
                expect(db.state(50))
                    .to.be.an('object')
                    .to.eql({'moon': 'super', 'sun': 'spotty', 'weather': 'foggy'});
            });

            it('all the latest state changes prevail after last change (specific state)', function () {
                let db = this.db;
                expect(db.state(51, 'weather'))
                    .to.be.an('string')
                    .to.eql('foggy');
                expect(db.state(51, 'sun'))
                    .to.be.an('string')
                    .to.eql('spotty');
                expect(db.state(51, 'moon'))
                    .to.be.an('string')
                    .to.eql('super');
            });

            it('all the latest state changes prevail after last change (all states)', function () {
                let db = this.db;
                expect(db.state(51))
                    .to.be.an('object')
                    .to.eql({'moon': 'super', 'sun': 'spotty', 'weather': 'foggy'});
            });

        });

        describe('state_detail', () => {

            it('returns null to first state before first change (specified state)', function () {
                let db = this.db;
                expect(db.state_detail(0, 'weather'))
                    .to.eql({'from': null, 'to': {'timestamp': 10, 'name': 'weather', 'val': 'raining'}});
                expect(db.state_detail(1, 'moon'))
                    .to.eql({'from': null, 'to': {'timestamp': 15, 'name': 'moon', 'val': 'full'}});
            });

            it('returns null to null before first change (specified non existing state)', function () {
                let db = this.db;
                expect(db.state_detail(0, 'missing'))
                    .to.eql({'from': null, 'to': null});
            });

            it('returns null to first state of all states before first change (all states)', function () {
                let db = this.db;
                expect(db.state_detail(0))
                    .to.eql([
                        {'from': null, 'to': {'timestamp': 15, 'name': 'moon', 'val': 'full'}},
                        {'from': null, 'to': {'timestamp': 25, 'name': 'sun', 'val': 'spotty'}},
                        {'from': null, 'to': {'timestamp': 10, 'name': 'weather', 'val': 'raining'}},
                    ]);
                expect(db.state_detail(1))
                    .to.eql([
                        {'from': null, 'to': {'timestamp': 15, 'name': 'moon', 'val': 'full'}},
                        {'from': null, 'to': {'timestamp': 25, 'name': 'sun', 'val': 'spotty'}},
                        {'from': null, 'to': {'timestamp': 10, 'name': 'weather', 'val': 'raining'}},
                    ]);
            });

            it('returns first to second state at first change (specified state)', function () {
                let db = this.db;
                expect(db.state_detail(10, 'weather'))
                    .to.eql({'from': {'timestamp': 10, 'name': 'weather', 'val': 'raining'},
                             'to': {'timestamp': 20, 'name': 'weather', 'val': 'sunny'}});
            });

            it('returns null to null at first change (specified non existing state)', function () {
                let db = this.db;
                expect(db.state_detail(10, '404'))
                    .to.eql({'from': null, 'to': null});
            });

            it('returns null to first state at first change (specified different state)', function () {
                let db = this.db;
                expect(db.state_detail(10, 'moon'))
                    .to.eql({'from': null, 'to': {'timestamp': 15, 'name': 'moon', 'val': 'full'}});
            });

            it('returns first to second state after first change (specified state)', function () {
                let db = this.db;
                expect(db.state_detail(11, 'weather'))
                    .to.eql({'from': {'timestamp': 10, 'name': 'weather', 'val': 'raining'},
                             'to': {'timestamp': 20, 'name': 'weather', 'val': 'sunny'}});
            });

            it('returns null to null after first change (specified non existing state)', function () {
                let db = this.db;
                expect(db.state_detail(11, '404'))
                    .to.eql({'from': null, 'to': null});
            });

            it('returns null to first state after first change (specified different state)', function () {
                let db = this.db;
                expect(db.state_detail(11, 'moon'))
                    .to.eql({'from': null, 'to': {'timestamp': 15, 'name': 'moon', 'val': 'full'}});
            });

            it('reflects first change at first change (all states)', function () {
                let db = this.db;
                expect(db.state_detail(10))
                    .to.eql([
                        {'from': null,
                         'to': {'timestamp': 15, 'name': 'moon', 'val': 'full'}},
                        {'from': null,
                         'to': {'timestamp': 25, 'name': 'sun', 'val': 'spotty'}},
                        {'from': {'timestamp': 10, 'name': 'weather', 'val': 'raining'},
                         'to': {'timestamp': 20, 'name': 'weather', 'val': 'sunny'}},
                    ]);
            });

            it('reflects first change after first change (all states)', function () {
                let db = this.db;
                expect(db.state_detail(11))
                    .to.eql([
                        {'from': null,
                         'to': {'timestamp': 15, 'name': 'moon', 'val': 'full'}},
                        {'from': null,
                         'to': {'timestamp': 25, 'name': 'sun', 'val': 'spotty'}},
                        {'from': {'timestamp': 10, 'name': 'weather', 'val': 'raining'},
                         'to': {'timestamp': 20, 'name': 'weather', 'val': 'sunny'}},
                    ]);
            });

            it('reflects first and second change at second change', function () {
                let db = this.db;
                expect(db.state_detail(15))
                    .to.eql([
                        {'from': {'timestamp': 15, 'name': 'moon', 'val': 'full'},
                         'to': {'timestamp': 30, 'name': 'moon', 'val': 'ecclipsed'}},
                        {'from': null,
                         'to': {'timestamp': 25, 'name': 'sun', 'val': 'spotty'}},
                        {'from': {'timestamp': 10, 'name': 'weather', 'val': 'raining'},
                         'to': {'timestamp': 20, 'name': 'weather', 'val': 'sunny'}},
                    ]);
            });

            it('reflects first and second change after second change', function () {
                let db = this.db;
                expect(db.state_detail(17))
                    .to.eql([
                        {'from': {'timestamp': 15, 'name': 'moon', 'val': 'full'},
                         'to': {'timestamp': 30, 'name': 'moon', 'val': 'ecclipsed'}},
                        {'from': null,
                         'to': {'timestamp': 25, 'name': 'sun', 'val': 'spotty'}},
                        {'from': {'timestamp': 10, 'name': 'weather', 'val': 'raining'},
                         'to': {'timestamp': 20, 'name': 'weather', 'val': 'sunny'}},
                    ]);
            });

            it('new changes of state replace previous changes at new change (specified state)', function () {
                let db = this.db;
                expect(db.state_detail(20, 'weather'))
                    .to.eql({'from': {'timestamp': 20, 'name': 'weather', 'val': 'sunny'},
                             'to': {'timestamp': 30, 'name': 'weather', 'val': 'foggy'}});
            });

            it('new changes of state replace previous changes after new change (all states)', function () {
                let db = this.db;
                expect(db.state_detail(21))
                    .to.eql([
                        {'from': {'timestamp': 15, 'name': 'moon', 'val': 'full'},
                         'to': {'timestamp': 30, 'name': 'moon', 'val': 'ecclipsed'}},
                        {'from': null,
                         'to': {'timestamp': 25, 'name': 'sun', 'val': 'spotty'}},
                        {'from': {'timestamp': 20, 'name': 'weather', 'val': 'sunny'},
                         'to': {'timestamp': 30, 'name': 'weather', 'val': 'foggy'}},
                    ]);
            });

            it('last state to null prevails at last change (specific state)', function () {
                let db = this.db;
                expect(db.state_detail(50, 'weather'))
                    .to.eql({'from': {'timestamp': 30, 'name': 'weather', 'val': 'foggy'}, 'to': null});
                expect(db.state_detail(50, 'sun'))
                    .to.eql({'from': {'timestamp': 25, 'name': 'sun', 'val': 'spotty'}, 'to': null});
                expect(db.state_detail(50, 'moon'))
                    .to.eql({'from': {'timestamp': 50, 'name': 'moon', 'val': 'super'}, 'to': null});
            });

            it('last state to null prevails at last change (all states)', function () {
                let db = this.db;
                expect(db.state_detail(50))
                    .to.eql([
                        {'from': {'timestamp': 50, 'name': 'moon', 'val': 'super'}, 'to': null},
                        {'from': {'timestamp': 25, 'name': 'sun', 'val': 'spotty'}, 'to': null},
                        {'from': {'timestamp': 30, 'name': 'weather', 'val': 'foggy'}, 'to': null},
                    ]);
            });

            it('last state to null prevails after last change (specific state)', function () {
                let db = this.db;
                expect(db.state_detail(51, 'weather'))
                    .to.eql({'from': {'timestamp': 30, 'name': 'weather', 'val': 'foggy'}, 'to': null});
                expect(db.state_detail(51, 'sun'))
                    .to.eql({'from': {'timestamp': 25, 'name': 'sun', 'val': 'spotty'}, 'to': null});
                expect(db.state_detail(51, 'moon'))
                    .to.eql({'from': {'timestamp': 50, 'name': 'moon', 'val': 'super'}, 'to': null});
            });

            it('last state to null prevails after last change (all states)', function () {
                let db = this.db;
                expect(db.state_detail(51))
                    .to.eql([
                        {'from': {'timestamp': 50, 'name': 'moon', 'val': 'super'}, 'to': null},
                        {'from': {'timestamp': 25, 'name': 'sun', 'val': 'spotty'}, 'to': null},
                        {'from': {'timestamp': 30, 'name': 'weather', 'val': 'foggy'}, 'to': null},
                    ]);
            });

            it('returns null if all its changes are quashed', function () {
                let db = this.db;
                db.add_change({'timestamp': 10, 'name': 'weather', 'val': null});
                db.add_change({'timestamp': 20, 'name': 'weather', 'val': null});
                db.add_change({'timestamp': 30, 'name': 'weather', 'val': null});
                expect(db.state_detail(0, 'weather')).to.eql(null);
                expect(db.state_detail(5, 'weather')).to.eql(null);
                expect(db.state_detail(15, 'weather')).to.eql(null);
                expect(db.state_detail(25, 'weather')).to.eql(null);
                expect(db.state_detail(35, 'weather')).to.eql(null);
            });

            it('state is ommitted if all its changes are quashed', function () {
                let db = this.db;
                db.add_change({'timestamp': 10, 'name': 'weather', 'val': null});
                db.add_change({'timestamp': 20, 'name': 'weather', 'val': null});
                db.add_change({'timestamp': 30, 'name': 'weather', 'val': null});
                expect(db.state_detail(0).weather).to.eql(undefined);
                expect(db.state_detail(5).weather).to.eql(undefined);
                expect(db.state_detail(15).weather).to.eql(undefined);
                expect(db.state_detail(25).weather).to.eql(undefined);
                expect(db.state_detail(35).weather).to.eql(undefined);
                expect(db.state_detail(51))
                    .to.eql([
                        {'from': {'timestamp': 50, 'name': 'moon', 'val': 'super'}, 'to': null},
                        {'from': {'timestamp': 25, 'name': 'sun', 'val': 'spotty'}, 'to': null},
                    ]);
            });

        });

        describe('events', () => {

            beforeEach(function () {
                this.db = new temporalstate();
            });

            it('emits "new_var" when adding change with new variable', function () {
                let db = this.db;
                let new_vars_emitted = {};
                db.on('new_var', (name) => {
                    new_vars_emitted[name] = true;
                });
                db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
                expect(new_vars_emitted.weather).to.eql(true);
                db.add_change({'timestamp': 20, 'name': 'moon', 'val': 'blood'});
                expect(new_vars_emitted.moon).to.eql(true);
                db.add_change({'timestamp': 30, 'name': 'sun', 'val': 'hot'});
                expect(new_vars_emitted.sun).to.eql(true);
            });

            it('does not emit "new_var" when adding change with previously known variable', function () {
                let db = this.db;
                db.add_change({'timestamp': 1, 'name': 'weather', 'val': 'sunny'});
                db.add_change({'timestamp': 2, 'name': 'moon', 'val': 'blue'});
                db.add_change({'timestamp': 3, 'name': 'sun', 'val': 'nova'});
                let new_vars_emitted = {};
                db.on('new_var', (name) => {
                    new_vars_emitted[name] = true;
                });
                db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
                expect(new_vars_emitted.weather).to.eql(undefined);
                db.add_change({'timestamp': 20, 'name': 'moon', 'val': 'blood'});
                expect(new_vars_emitted.moon).to.eql(undefined);
                db.add_change({'timestamp': 30, 'name': 'sun', 'val': 'hot'});
                expect(new_vars_emitted.sun).to.eql(undefined);
            });

            it('emits "add" when adding change', function () {
                let db = this.db;
                let emitted_add;
                db.on('add', (change) => {
                    emitted_add = change;
                });
                db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
                expect(emitted_add).to.eql({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
            });

            it('does not emit "add" when change is redundant', function () {
                let db = this.db;
                db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
                let emitted_add;
                db.on('add', (change) => {
                    emitted_add = change;
                });
                db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
                expect(emitted_add).to.eql(undefined);
            });

            it('emits "rm" when adding change which renders existing change redundant', function () {
                let db = this.db;
                db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
                db.add_change({'timestamp': 20, 'name': 'weather', 'val': 'sunny'});
                let emitted_rm;
                db.on('rm', (change) => {
                    emitted_rm = change;
                });
                db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'sunny'});
                expect(emitted_rm).to.eql({'timestamp': 20, 'name': 'weather', 'val': 'sunny'});
            });

            it('emits "rm" when adding change which renders existing change redundant', function () {
                let db = this.db;
                db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
                db.add_change({'timestamp': 20, 'name': 'weather', 'val': 'sunny'});
                let emitted_rm;
                db.on('rm', (change) => {
                    emitted_rm = change;
                });
                db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'sunny'});
                expect(emitted_rm).to.eql({'timestamp': 20, 'name': 'weather', 'val': 'sunny'});
            });

            it('does not emit "rm" when adding change which renders no existing change redundant', function () {
                let db = this.db;
                db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
                db.add_change({'timestamp': 20, 'name': 'weather', 'val': 'sunny'});
                let emitted_rm;
                db.on('rm', (change) => {
                    emitted_rm = change;
                });
                db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'fair'});
                expect(emitted_rm).to.eql(undefined);
            });

            it('emits "change" when changing existing var time to a different value', function () {
                let db = this.db;
                db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
                let emitted_change;
                db.on('change', (orig, new_val) => {
                    emitted_change = [orig, new_val];
                });
                db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'sunny'});
                expect(emitted_change).to.eql([{'timestamp': 10, 'name': 'weather', 'val': 'raining'}, 'sunny']);
            });

            it('emits "change" when changing existing var time to the same value', function () {
                let db = this.db;
                db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
                let emitted_change;
                db.on('change', (orig, new_val) => {
                    emitted_change = [orig, new_val];
                });
                db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
                expect(emitted_change).to.eql(undefined);
            });

            it('emits "rm" when removing a change', function () {
                let db = this.db;
                db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
                db.add_change({'timestamp': 20, 'name': 'weather', 'val': 'sunny'});
                let emitted_change;
                db.on('rm', (change) => {
                    emitted_change = change;
                });
                db.remove_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
                expect(emitted_change).to.eql({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
            });

            it('emits "txn_start" when removing a change', function () {
                let db = this.db;
                db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
                db.add_change({'timestamp': 20, 'name': 'weather', 'val': 'sunny'});
                let emitted_txn;
                db.on('txn_start', (change, ops) => {
                    emitted_txn = [change, ops];
                });
                db.remove_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
                expect(emitted_txn).to.eql([
                    {'remove': {'timestamp': 10, 'name': 'weather', 'val': 'raining'}},
                    [{'remove': {'timestamp': 10, 'name': 'weather', 'val': 'raining'}}],
                ]);
            });

            it('emits "rm" when removing a non existing change', function () {
                let db = this.db;
                db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
                db.add_change({'timestamp': 20, 'name': 'weather', 'val': 'sunny'});
                let emitted_changes = 0;
                db.on('rm', (change) => {
                    emitted_changes++;
                });
                db.remove_change({'timestamp': 20, 'name': 'weather', 'val': 'foggy'});
                expect(emitted_changes).to.eql(0);
                db.remove_change({'timestamp': 20, 'name': 'sun', 'val': 'sunny'});
                expect(emitted_changes).to.eql(0);
                db.remove_change({'timestamp': 10, 'name': 'weather', 'val': 'sunny'});
                expect(emitted_changes).to.eql(0);
                db.remove_change({'timestamp': 20, 'name': 'unknown', 'val': 'sunny'});
                expect(emitted_changes).to.eql(0);
            });

            it('emits "txn_start" with multiple values when mutliple changes happen at once', function () {
                let db = this.db;
                expect(db.change_list())
                    .to.be.an('array')
                    .is.lengthOf(0);
                db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
                db.add_change({'timestamp': 20, 'name': 'weather', 'val': 'sunny'});
                db.add_change({'timestamp': 30, 'name': 'weather', 'val': 'raining'});
                expect(db.change_list())
                    .to.be.an('array')
                    .is.lengthOf(3)
                    .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'})
                    .to.include({'timestamp': 20, 'name': 'weather', 'val': 'sunny'})
                    .to.include({'timestamp': 30, 'name': 'weather', 'val': 'raining'});
                let emitted_txn;
                db.on('txn_start', (change, ops) => {
                    emitted_txn = [change, ops];
                });
                db.add_change({'timestamp': 20, 'name': 'weather', 'val': 'raining'});
                expect(emitted_txn).to.eql([
                    {'add': {'timestamp': 20, 'name': 'weather', 'val': 'raining'}},
                    [{'remove': {'timestamp': 20, 'name': 'weather', 'val': 'sunny'}},
                     {'remove': {'timestamp': 30, 'name': 'weather', 'val': 'raining'}}]
                ]);
            });

            it('emits "txn_start" before changes occur', function () {
                let db = this.db;
                expect(db.change_list())
                    .to.be.an('array')
                    .is.lengthOf(0);
                db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
                db.add_change({'timestamp': 20, 'name': 'weather', 'val': 'sunny'});
                db.add_change({'timestamp': 30, 'name': 'weather', 'val': 'raining'});
                expect(db.change_list())
                    .to.be.an('array')
                    .is.lengthOf(3)
                    .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'})
                    .to.include({'timestamp': 20, 'name': 'weather', 'val': 'sunny'})
                    .to.include({'timestamp': 30, 'name': 'weather', 'val': 'raining'});
                let emitted_txn;
                db.on('txn_start', (change, ops) => {
                    emitted_txn = [change, ops];
                    expect(db.change_list())
                        .to.be.an('array')
                        .is.lengthOf(3)
                        .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'})
                        .to.include({'timestamp': 20, 'name': 'weather', 'val': 'sunny'})
                        .to.include({'timestamp': 30, 'name': 'weather', 'val': 'raining'});
                });
                db.add_change({'timestamp': 20, 'name': 'weather', 'val': 'raining'});
                expect(emitted_txn).to.eql([
                    {'add': {'timestamp': 20, 'name': 'weather', 'val': 'raining'}},
                    [{'remove': {'timestamp': 20, 'name': 'weather', 'val': 'sunny'}},
                     {'remove': {'timestamp': 30, 'name': 'weather', 'val': 'raining'}}]
                ]);
            });

            it('emits "txn_end" after changes occur', function () {
                let db = this.db;
                expect(db.change_list())
                    .to.be.an('array')
                    .is.lengthOf(0);
                db.add_change({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
                db.add_change({'timestamp': 20, 'name': 'weather', 'val': 'sunny'});
                db.add_change({'timestamp': 30, 'name': 'weather', 'val': 'raining'});
                expect(db.change_list())
                    .to.be.an('array')
                    .is.lengthOf(3)
                    .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'})
                    .to.include({'timestamp': 20, 'name': 'weather', 'val': 'sunny'})
                    .to.include({'timestamp': 30, 'name': 'weather', 'val': 'raining'});
                let emitted_txn;
                db.on('txn_end', (change, ops) => {
                    emitted_txn = [change, ops];
                    expect(db.change_list())
                        .to.be.an('array')
                        .is.lengthOf(1)
                        .to.include({'timestamp': 10, 'name': 'weather', 'val': 'raining'});
                });
                db.add_change({'timestamp': 20, 'name': 'weather', 'val': 'raining'});
                expect(emitted_txn).to.eql([
                    {'add': {'timestamp': 20, 'name': 'weather', 'val': 'raining'}},
                    [{'remove': {'timestamp': 20, 'name': 'weather', 'val': 'sunny'}},
                     {'remove': {'timestamp': 30, 'name': 'weather', 'val': 'raining'}}]
                ]);
            });

        });

    });

});
