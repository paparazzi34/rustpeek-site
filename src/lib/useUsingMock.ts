import { useSyncExternalStore } from 'react'
import { getUsingMock, subscribeUsingMock } from './api'

/** Подписка на признак «сидим на демо-данных».
    Нужна потому, что флаг переключается после первого запроса, а не при
    загрузке модуля: без подписки полоса-предупреждение просто не появится. */
export function useUsingMock() {
  return useSyncExternalStore(subscribeUsingMock, getUsingMock, getUsingMock)
}
