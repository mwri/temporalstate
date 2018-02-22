module.exports = function(grunt) {

    require('load-grunt-tasks')(grunt);

    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),

        jshint: {
            files: ['gruntfile.js', 'lib/*.js', 'test/*.js'],
            options: {
                esversion: 6,
                '-W083':  true,
            }
        },

        mochaTest: {
            test: {
                options: {
                    require: ['babel-core/register'],
                },
                src: ['test/*.js'],
            },
        },

        mocha_istanbul: {
            src: ['test/*.js'],
            options: {
                scriptPath: require.resolve('.bin/babel-istanbul'),
                nodeExec: require.resolve('.bin/babel-node'),
            },
        },

        watch: {
            test: {
                options: { spawn: true },
                files: ['gruntfile.js', 'lib/*.js', 'test/*.js'],
                tasks: ['test'],
            },
            build: {
                options: { spawn: true },
                files: ['gruntfile.js', 'lib/*.js', 'test/*.js'],
                tasks: ['build'],
            },
        },

        eslint: {
            target: ['lib'],
        },

        babel: {
            dist: {
                files: {
                    'dist/<%=pkg.name%>_es5.js': 'lib/<%=pkg.name%>.js',
                },
            },
        },

        clean: [
            'node_modules',
        ],

        gitstatus: {
            publish: {
                options: {
                    callback: function (r) {
                        if (r.length > 0)
                            throw new Error('git status unclean');
                    },
                },
            },
        },

    });

    grunt.registerTask('test', [
        'mochaTest',
    ]);

    grunt.registerTask('build', [
        'jshint',
        'eslint',
        'mocha_istanbul',
        'babel',
    ]);

    grunt.registerTask('prepublish', [
        'clean',
        'gitstatus:publish',
    ]);

};
