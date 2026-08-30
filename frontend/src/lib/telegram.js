// Telegram WebApp integration

export const initTelegram = () => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp
    tg.ready()
    tg.expand()
    return tg
  }
  return null
}

export const getTelegramUser = () => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
    const tg = window.Telegram.WebApp
    return {
      id: tg.initDataUnsafe?.user?.id,
      username: tg.initDataUnsafe?.user?.username,
      firstName: tg.initDataUnsafe?.user?.first_name,
      lastName: tg.initDataUnsafe?.user?.last_name,
      photoUrl: tg.initDataUnsafe?.user?.photo_url,
      initData: tg.initData,
    }
  }
  return null
}

export const showMainButton = (text, callback) => {
  const tg = window.Telegram?.WebApp
  if (!tg) return
  tg.MainButton.text = text
  tg.MainButton.show()
  tg.onEvent('mainButtonClicked', callback)
}

export const hideMainButton = () => {
  const tg = window.Telegram?.WebApp
  if (tg) tg.MainButton.hide()
}

export const haptic = (type = 'light') => {
  const tg = window.Telegram?.WebApp
  if (!tg) return
  if (type === 'light') tg.HapticFeedback.impactOccurred('light')
  else if (type === 'medium') tg.HapticFeedback.impactOccurred('medium')
  else if (type === 'heavy') tg.HapticFeedback.impactOccurred('heavy')
  else tg.HapticFeedback.notificationOccurred('success')
}

export const openLink = (url) => {
  const tg = window.Telegram?.WebApp
  if (tg) tg.openLink(url)
  else window.open(url)
}

export const closeApp = () => {
  const tg = window.Telegram?.WebApp
  if (tg) tg.close()
}
