define(['require', 'lodash', 'angular', 'moment-timezone', 'app', 'directives/date-picker'], function(require, _, ng, moment) {

    return ['$http', '$route', '$location', '$scope', '$q', '$compile', function($http, $route, $location, $scope, $q, $compile) {

        var _ctrl = this;

        _ctrl.save   = save;
        _ctrl.cancel = close;
        _ctrl.updateFeeds = updateFeeds;
        _ctrl.changedStartDay  = function() { if( _ctrl.startDay  > _ctrl.endDay)  { _ctrl.endDay    = _ctrl.startDay;  } updateSchedules(); };
        _ctrl.changedEndDay    = function() { if( _ctrl.startDay  > _ctrl.endDay)  { _ctrl.startDay  = _ctrl.endDay;    } updateSchedules(); };
        _ctrl.changedStartTime = function() { if( _ctrl.startTime > _ctrl.endTime) { _ctrl.endTime   = _ctrl.startTime; } updateSchedules(); };
        _ctrl.changedEndTime   = function() { if( _ctrl.startTime > _ctrl.endTime) { _ctrl.startTime = _ctrl.endTime;   } updateSchedules(); };

        $scope.$watch('frameIdCtrl.frame.content.type', function(type, oldType) {

            if(type==oldType)
                return;

            instantciateFrameType(type);
        });

        init();

        return this;

        //==============================
        //
        //==============================
        function init() {

            var eventGroupId = $route.current.params.eventId;

            var qEvents = $http.get('/api/v2016/event-groups/'+eventGroupId, { cache : true });
            var qFeeds  = $http.get('/api/v2016/cctv-feeds', { params : { q : { eventGroup : eventGroupId } }});

            return $q.all([qEvents, qFeeds]).then(function(res) {

                var eventGroup = res[0].data;
                var feeds      = res[1].data;

                _ctrl.eventGroup   = eventGroup;
                _ctrl.feeds        = feeds;

            }).then(function () {

                return load();

            }).catch(errorHandler);
        }

        //==============================
        //
        //==============================
        function load() {

            $q.when($route.current.params.id).then(function(frameId) {

                if(frameId=='new') {

                    var day;
                    var minDay = moment.tz(_ctrl.eventGroup.StartDate, _ctrl.eventGroup.timezone);

                    day = moment.tz($route.current.params.day || new Date(), _ctrl.eventGroup.timezone);

                    if(!day.isValid() || day.isBefore(minDay))
                        day = new moment(minDay);

                    var start = moment(day).startOf('day').toDate(); //  0:00
                    var end   = moment(day).startOf('day').hour(23).minute(55).toDate(); // 23:55

                    return {
                        eventGroup : _ctrl.eventGroup._id,
                        content: { type: 'news' },
                        schedules : buildDailySchedules(start, end),
                        feeds : [],
                    };
                }
                else {

                    return $http.get('/api/v2016/cctv-frames/'+frameId).then(function (res) {
                        return res.data;
                    });
                }

            }).then(function(frame){

                _ctrl.frame = frame;

                _ctrl.startDay  = moment.tz(_.first(frame.schedules).start, _ctrl.eventGroup.timezone).format("YYYY-MM-DD");
                _ctrl.startTime = moment.tz(_.first(frame.schedules).start, _ctrl.eventGroup.timezone).format("HH:mm");
                _ctrl.endDay    = moment.tz(_.last (frame.schedules).end  , _ctrl.eventGroup.timezone).format("YYYY-MM-DD");
                _ctrl.endTime   = moment.tz(_.last (frame.schedules).end  , _ctrl.eventGroup.timezone).format("HH:mm");

                _ctrl.selectedFeeds = _.reduce(frame.feeds, function(ret, id){
                    ret[id] = true;
                    return ret;
                }, {});

                instantciateFrameType();
            });



        }

        //==============================
        //
        //==============================
        function save() {

            var frame = _ctrl.frame;
            var id    = _ctrl.frame._id;

            var savePromise = id ? $http.put ('/api/v2016/cctv-frames/'+id, frame):
                                   $http.post('/api/v2016/cctv-frames',     frame);

            return savePromise.then(function(res) {

                frame._id = res.data._id || frame._id;

                $scope.$emit('showSuccess', 'CCTV Frame "'+frame.content.type+'" saved');

                close();

            }).catch(errorHandler);
        }

        //==============================
        //
        //==============================
        function updateSchedules() {

            var start = moment.tz(_ctrl.startDay + ' ' + _ctrl.startTime, _ctrl.eventGroup.timezone).toDate();
            var end   = moment.tz(_ctrl.endDay   + ' ' + _ctrl.endTime,   _ctrl.eventGroup.timezone).toDate();

            _ctrl.frame.schedules = buildDailySchedules(start, end);
        }

        //==============================
        //
        //==============================
        function buildDailySchedules(start, end) {

            start = moment(start).utc();
            end   = moment(end)  .utc();

            if(end.isBefore(start))
                throw "bad schedule dates";

            var schedules = [];
            var loopGuard=64;

            while(start.isSameOrBefore(end)) {

                var dailyStart = moment(start).utc();
                var dailyEnd   = moment(start).utc().hour(end.hour()).minute(end.minute());

                if(dailyEnd.isBefore(dailyStart))
                    dailyEnd.add(1, 'days');

                schedules.push({
                    start : dailyStart.toDate(),
                    end   : dailyEnd  .toDate()
                });

                start = start.add(1, 'days');

                if(--loopGuard<0) throw "loop detected";
            }

            return schedules;
        }

        //==============================
        //
        //==============================
        function updateFeeds() {
            _ctrl.frame.feeds = [];

            _.forEach(_ctrl.selectedFeeds, function(selected, key) {
                if(selected)
                    _ctrl.frame.feeds.push(key);
            });
        }

        //==============================
        //
        //==============================
        function close() {
            $location.url($location.path().replace(/(.*)\/[a-z0-9]*/i, '$1'));
        }

        //==============================
        //
        //==============================
        function instantciateFrameType(type) {

            var container = ng.element(document).find('#frameTypeContainer');

            container.empty();

            if(!type)
                return;

            require(['directives/cctv/frames/'+type], function() { //success

                $scope.$applyAsync(function(){

                    var linkFn    = $compile('<cctv-frame-'+type+' content="frameIdCtrl.frame.content"></cctv-frame-'+type+'>');
                    var content   = linkFn($scope);

                    container.append(content);
                });

            }, function(err) { //error

                $scope.$applyAsync(function() {
                    $scope.$emit('showError', "Unable to load directive for type: "+type+'\n'+err);
                });
            });
        }


        //==============================
        //
        //==============================
        function errorHandler(err) {

            err = err         || "Unknow error";
            err = err.data    || err;
            err = err.message || err;

            $scope.$emit('showError', err);
        }
    }];
});
