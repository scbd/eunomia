define(['app', 'lodash', 'text!./room-row.html','text!../forms/edit/room-dialog.html','css!./room-row.css',
  'ngDialog',
  '../forms/edit/room',
], function(app, _, template,roomDialog) {

  app.directive("roomRow", ['ngDialog',
    function(ngDialog) {
      return {
        restrict: 'E',
        template: template,
        replace: true,
        transclude: false,
        scope: {
          'room': '='
        },
        controller: function($scope,$element,scheduleService) {

            init();

            //============================================================
            //
            //============================================================
            function init() {
                $scope.rowHeight=scheduleService.getRowHeight();
                $element.height($scope.rowHeight);
            } //init

            //============================================================
            //
            //============================================================
            $scope.roomDialog = function(room) {
                $scope.editRoom = room;
                ngDialog.open({
                  template: roomDialog,
                  className: 'ngdialog-theme-default',
                  closeByDocument: true,
                  plain: true,
                  scope: $scope
                });
            };//$scope.roomDialog

          } //link
      }; //return
    }
  ]);
});