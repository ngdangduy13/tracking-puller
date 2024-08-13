import { ipcMain } from 'electron'

export function IpcService<T extends { new (...args: any[]): {} }>(name: string) {
  return (constructor: T) => {
    return class extends constructor {
      constructor(...args: any[]) {
        super(...args)
        this.registerHandlers(name)
      }

      registerHandlers(serviceName: string) {
        constructor.prototype._handlers.forEach((handlerName: string) => {
          ipcMain.handle(`${serviceName}.${handlerName}`, (_1, ...handlerParams) => {
            return constructor.prototype[handlerName].apply(this, handlerParams)
          })
        })
      }
    }
  }
}

export function IpcHandler(target: any, propertyKey: string) {
  if (!target.constructor.prototype._handlers) {
    target.constructor.prototype._handlers = []
  }
  target.constructor.prototype._handlers.push(propertyKey)
}
