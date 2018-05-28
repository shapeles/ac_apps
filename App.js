Ext.define('CustomApp', {
  extend: 'Rally.app.App',
  componentCls: 'app', // CSS file
  myModels: ['PortfolioItem/Feature'],
  myGrid: undefined,

  launch: function () {
    var me = this;

    console.log("Create new TreeStore");
    Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
      models: me.myModels,
      //autoLoad: true,
      fetch: ['Predecessors', 'FormattedID', 'Name', 'Successors', 'Project', 'State', 'Release'],
      enableHierarchy: false,
      scope: me,
      listeners: {
        scope: me,
        load: function (store) {
          var records = store.getRootNode().childNodes;
          console.log("store:event - load");

          var promises = me._getAllDecessors(records);
          Deft.Promise.all(promises).then({
            scope: me,
            success: function () {
              //all data loaded.
              console.log("_getAllDecessors done");

              if (!me.myGrid) {
                me._onStoreBuilt(store);
              } else {
                console.log("grid already created, me.myGrid = ", me.myGrid);
                me.myGrid.getGridOrBoard().getView().refresh();
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

  config: {
    defaultSettings: {
      currency: 'EUR',
      costColorLimitYellow: 0.8
    }
  },


  _getAllDecessors: function (records) {
    console.log("_getAllDecessors()");

    //var me = this;
    var promises = [];

    //var records = me.myFeatureStore.getRecords();
    //var records = store.getRootNode().childNodes;

    _.each(records, function (feature) {
      //create the stores to load the collections
      feature.predecessorStore = feature.getCollection('Predecessors');
      feature.successorStore = feature.getCollection('Successors');

      //load the stores and keep track of the load operations
      if (feature.predecessorStore.initialCount > 0) {
        promises.push(feature.predecessorStore.load({
          fetch: ['FormattedID', 'Name', 'Project', 'State']
        }));
      }

      if (feature.successorStore.initialCount > 0) {
        promises.push(feature.successorStore.load({
          fetch: ['FormattedID', 'Name', 'Project', 'State']
        }));
      }
    }); //_.each

    return promises;
  },

  _loadStore: function (store) {
    console.log("calling store.load()");
    store.load();
  },

  getSettingsFields: function () {
    return [{
        name: 'currency',
        xtype: 'rallytextfield',
        label: 'Currency'
      },
      {
        name: 'costColorLimitYellow',
        xtype: 'rallynumberfield',
        label: 'Percent limit for Yellow in cost load'
      }
    ];
  },

  _onStoreBuilt: function (store) {
    var me = this;
    console.log("_onStoreBuilt: function (store) =  ", store);

    me.myGrid = me.add({
      xtype: 'rallygridboard',
      modelNames: me.myModels,
      toggleState: 'grid',
      stateful: false,
      //rankable: false,
      context: me.getContext(),
      /* 
            plugins: [
              'rallygridboardaddnew',
              {
                ptype: 'rallygridboardinlinefiltercontrol',
                inlineFilterButtonConfig: {
                  modelNames: me.myModels,
                  stateful: true,
                  stateId: me.getContext().getScopedStateId('filters'),
                  inlineFilterPanelConfig: {
                    collapsed: true,
                    quickFilterPanelConfig: {
                      fieldNames: ['Owner', 'State']
                    }
                  }
                }
              }
                    ,                       
                                           {
                                                ptype: 'rallygridboardfieldpicker',
                                                headerPosition: 'left',
                                                modelNames: me.myModels,
                                                //gridAlwaysSelectedValue: ['Name', 'State', 'PercentDoneByStoryPlanEstimate', 'Owner', 'Budget', 'CostToDate', 'HoursToDate'],
                                                //gridAlwaysSelectedValue: ['Name', 'State', 'Predecessors', 'Successors'],
                                                gridAlwaysSelectedValue: ['Name', 'State'],
                                                stateful: true,
                                                stateId: this.getContext().getScopedStateId('field-picker')
                                            }
              
            ],
      */
      gridConfig: {
        store: store,
        columnCfgs: [{
            xtype: 'templatecolumn',
            align: 'left',
            tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate'),
            text: 'Predecessors',
            dataIndex: 'Predecessors',
            width: 200,

            renderer: function (value, metaData, record) {
              console.log("predecessor renderer");
              var mFieldOutputPre = '';
              var records = record.predecessorStore.getRecords();
              //console.log("records = ", records);

              _.each(records, function (feature) {
                //console.log('feature = ', feature);
                mFieldOutputPre += Rally.nav.DetailLink.getLink({
                  record: feature,
                  text: feature.get('FormattedID'),
                  showTooltip: true
                });
                // Add the feature name and a line break.
                mFieldOutputPre += ' - ' + feature.get('Name') + '<br>';
              }); //_.each
              return mFieldOutputPre;
            }
          },
          {
            text: 'ID',
            dataIndex: 'FormattedID',
            width: 50
          },
          {
            text: 'Name',
            dataIndex: 'Name',
            flex: 1
          },
          {
            text: 'Release',
            dataIndex: 'Release',
          },
          {
            text: 'State',
            dataIndex: 'State',
          },
          { // Column 'Successors'
            xtype: 'templatecolumn',
            align: 'left',
            tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate'),
            text: 'Successors',
            dataIndex: 'Successors',
            width: 200,

            renderer: function (value, metaData, record) {
              //console.log("successor renderer");
              var mFieldOutputSuc = '';
              var records = record.successorStore.getRecords();

              _.each(records, function (feature) {
                //console.log('feature = ', feature);
                mFieldOutputSuc += Rally.nav.DetailLink.getLink({
                  record: feature,
                  text: feature.get('FormattedID'),
                  showTooltip: true
                });
                // Add the feature name and a line break.
                mFieldOutputSuc += ' - ' + feature.get('Name') + '<br>';
              }); //_.each

              return mFieldOutputSuc;
            }, //renderer: function(value, metaData, record) {
          } // Column 'Successors'
        ] //columnCfg
      }, //gridConfig
      height: me.getHeight()
    });
    //console.log("me.myGrid = ", me.myGrid);
  }
});