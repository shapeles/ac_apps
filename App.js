Ext.define('FeatureDependencyList', {
  extend: 'Rally.app.App',
  componentCls: 'app', // CSS file
  myModels: ['PortfolioItem/Feature'],
  myGrid: undefined,

  launch: function () {
    var me = this;

    //console.log("Create new TreeStore");
    Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
      models: me.myModels,
      //autoLoad: true,
      fetch: ['ReleaseDate', 'Predecessors', 'FormattedID', 'Name', 'Successors', 'Project', 'State', 'Release'],
      //fetch: true,
      enableHierarchy: false,
      context: me.getContext().getDataContext(),
      scope: me,
      listeners: {
        scope: me,
        load: function (store) {
          var records = store.getRootNode().childNodes;
          //console.log("store:event - load");

          var promises = me._getAllDecessors(records);
          Deft.Promise.all(promises).then({
            scope: me,
            success: function () {
              //all data loaded.
              //console.log("_getAllDecessors done");

              if (!me.myGrid) {
                me._onStoreBuilt(store);
              } else {
                console.log("grid already created, me.myGrid = ", me.myGrid);
                //me.myGrid.getGridOrBoard().getView().refresh();
                //me.myGrid.refresh();
              }
            },
          });
        }
      }
    }).then({
      success: me._loadStore,
      scope: me
    });
  },

  _loadStore: function (store) {
    //console.log("calling store.load()");
    store.load();
  },

  _getAllDecessors: function (records) {
    //console.log("_getAllDecessors()");
    //var me = this;
    var promises = [];

    _.each(records, function (feature) {
      //create the stores to load the collections
      feature.predecessorStore = feature.getCollection('Predecessors');
      feature.successorStore = feature.getCollection('Successors');

      //load the stores and keep track of the load operations
      if (feature.predecessorStore.initialCount > 0) {
        promises.push(feature.predecessorStore.load({
          fetch: ['FormattedID', 'Name', 'Project', 'State', 'Release', 'ReleaseDate']
        }));
      }

      if (feature.successorStore.initialCount > 0) {
        promises.push(feature.successorStore.load({
          fetch: ['FormattedID', 'Name', 'Project', 'State', 'Release', 'ReleaseDate']
        }));
      }
    }); //_.each

    return promises;
  },

  _onStoreBuilt: function (store) {
    var me = this;
    //console.log("_onStoreBuilt: function (store) =  ", store);

    me.myGrid = me.add({
      xtype: 'rallytreegrid',
      store: store,
      enableColumnMove: false,
      enableInlineAdd: false,
      shouldShowRowActionsColumn: false,
      enableBulkEdit: false,
      enableRanking: false,

      columnCfgs: me._getColumnCfgs()

    });
  },

  _getColumnCfgs: function () {
    var me = this;
    var columnCfgs = [];

    columnCfgs.push({ // Column 'Successors'
        align: 'left',
        text: 'Predecessors',
        dataIndex: 'Predecessors',
        tdCls: 'dependencies', //css definition
        width: 300,
        renderer: function (value, metaData, record) {
          //console.log("Predecessor:renders");
          var records = record.predecessorStore.getRecords();
          return me._renderDependencies(records, record.get("Release"), true);
        }
      } // Column 'Successors'
    );

    columnCfgs.push({
        text: 'ID',
        dataIndex: 'FormattedID',
        width: 50
      },
      'Name',
      'Release',
      'State'
    );



    columnCfgs.push({ // Column 'Successors'
        align: 'left',
        text: 'Successors',
        dataIndex: 'Successors',
        tdCls: 'dependencies', //css definition
        width: 300,
        renderer: function (value, metaData, record) {
          //console.log("successors:renders");
          //console.log("record.Release.Name = ", record.get("Release").Name);
          var records = record.successorStore.getRecords();

          return me._renderDependencies(records, record.get("Release"), false);
        }
      } // Column 'Successors'
    );

    return columnCfgs;
  },

  _releaseDependencyWarning: function (parentRelease, dependencyRelease, predecessor) {

    var outputString = '';

    if (parentRelease) {
      if (dependencyRelease) {
        if (parentRelease._ref === dependencyRelease._ref) {
          //Warning = Yellow - same release, thus risk of not correct order
          outputString = '<div class="colorcell warning">';
        } else {
          if (parentRelease.ReleaseDate > dependencyRelease.ReleaseDate) {
            if (predecessor) {
              // No Warning - predecessor date is earlier than parent
              outputString = '<div class="colorcell dependencies">';
            } else {
              // Error (red) - successor release date is earlier parent release date
              outputString = '<div class="colorcell error">';
            }
          } else {
            if (predecessor) {
              // Error (red) - predecessor release date is later than parent release date
              outputString = '<div class="colorcell error">';
            } else {
              // No warning - successor date is later than parent
              outputString = '<div class="colorcell dependencies">';
            }
          }
        }
      } else {
        if (predecessor) {
          // Error (red) release date not set for a predecessor
          outputString = '<div class="colorcell error">';
        } else { //successor
          // No Warning - successor release not set, but that is ok
          outputString = '<div class="colorcell dependencies">';
        }
      }
    } else {
      if (predecessor) {
        // No Warning
        outputString = '<div class="colorcell dependencies">';
      } else {
        // Error (red) successor at risk, since release not set for parent
        outputString = '<div class="colorcell error">';
      }
    }

    return outputString;
  },

  /*
    Create lines of predecessors and successors
  */
  _renderDependencies: function (records, release, predecessor) {
    var mFieldOutput = "";
    var me = this;


    _.each(records, function (feature) {

      mFieldOutput += me._releaseDependencyWarning(release, feature.get("Release"), predecessor);

      mFieldOutput += Rally.nav.DetailLink.getLink({
        record: feature,
        text: feature.get('FormattedID'),
        showTooltip: true
      });
      // Add the feature name, release and a line break.
      mFieldOutput += ' - ' + feature.get('Name');
      if (feature.get("Release")) {
        mFieldOutput += " (" + feature.get("Release").Name + ")";
      } else {
        mFieldOutput += " (Not planned)";
      }
      mFieldOutput += '<br>';
      mFieldOutput += '</div>';
    }); //_.each

    return mFieldOutput;
  }

});