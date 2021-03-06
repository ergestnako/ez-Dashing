import Logger from 'utils/Logger';
import { GridEvent } from 'redux/event/GridEvent';
import { DataSourceEvent } from 'redux/event/DataSourceEvent';
import { SetupEvent } from 'redux/event/SetupEvent';
import { WidgetEvent } from 'redux/event/WidgetEvent';

const logger = Logger.getLogger("WidgetReducer");
const initialState = {};


const findById = (dataSources, id) => {
  return dataSources.find(ds => ds.id == id);
};

const indexOfId = (dataSources, id) => {
  const ds = dataSources.find(ds => ds.id == id);
  return dataSources.indexOf(ds);
};


/**
 * This reducer manage the 'widgets' tree state part, in other words, all Widgets properties.
 * Note that in order to make Widgets as dump as possible, we give them the loaded property of each dataSources
 * they depend on. Thus, widgets only depend on this state tree part by default.
 */
export default function(state = initialState, action) {

  let newState = {
    ...state
  };

  switch (action.type) {


    /**
     * When configuration is loaded, we update all widgets properties
     */
    case SetupEvent.ConfigLoadSuccess:
      logger.debug("ConfigLoadSuccess");
      const widgetConfigs = action.dashboardConfig.widgets;

      widgetConfigs.forEach(widgetConfig => {
        let widgetDataSource = [];
        widgetConfig.dataSource.forEach(dsId => {
          widgetDataSource.push({
            id: dsId,
            loaded: false
          });
        });
        newState[widgetConfig.id] = {
          ...state[widgetConfig.id],
          ...widgetConfig,
          dataSource: widgetDataSource
        };
      });
      break;


    /**
     * When a widget is resized, we update its sizeInfo property.
     */
    case GridEvent.ItemResized:
      logger.trace("ItemResized (widgetId={})", action.widgetId);
      const widgetId = action.widgetId;
      const sizeInfo = action.payload;

      newState[widgetId] = {
        ...state[widgetId],
        sizeInfo: sizeInfo
      };
      break;


    /**
     * When the Grid is ready, we can finally display the widgets by give them the loaded property
     */
    case GridEvent.Ready:
      logger.debug("GridReady");

      action.widgetIds.forEach(id => {
        newState[id] = {
          ...state[id],
          loaded: true
        }
      });
      break;


    /**
     * When a dataSource is refreshed, we need to update properties of all widgets interested by this dataSource.
     */
    case DataSourceEvent.DataSourceRefreshed:
      logger.debug("DataSourceRefreshed (id={})", action.dataSourceId);
      const { dataSourceId } = action;
      const properties = action.payload;

      action.widgetIdsListening.forEach(id => {
        const dataSourceToUpdate = findById(state[id].dataSource, dataSourceId);
        const dataSourceToUpdateIndex = indexOfId(state[id].dataSource, dataSourceId);

        newState[id] = {
          ...state[id],
          ...properties,
          dataSource: [
            ...newState[id].dataSource.slice(0, dataSourceToUpdateIndex),
            {
              ...dataSourceToUpdate,
              loaded: true
            },
            ...newState[id].dataSource.slice(dataSourceToUpdateIndex + 1)
          ]
        }
      });
      logger.trace("New state: ", newState);
      break;

    /**
     * When a widget is updated (server confirmed the update), we update the corresponding widget state
     */
    case WidgetEvent.UpdateConfigSuccess:
      logger.debug("UpdateConfigSuccess (id={})", action.widgetId);
      newState[action.widgetId] = {
        ...state[action.widgetId],
        ...action.payload
      };
      break;

    /**
     *
     */
    case WidgetEvent.UpdateAll:
      logger.debug("UpdateAll", action.payload);
      action.payload.forEach(widgetConfig => {
        newState[widgetConfig.id] = {
          ...state[widgetConfig.id],
          ...widgetConfig
        };
      });
      break;

    default:
      return state;

  }

  logger.trace("New state: ", newState);
  return newState;
}
