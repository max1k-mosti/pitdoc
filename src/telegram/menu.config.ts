import { ReplyKeyboardMarkup } from 'grammy/types'

export const MENU: ReplyKeyboardMarkup = {
	keyboard: [
		[{ text: '💳 Сформувати рахунок' }, { text: '📝 Сформувати акт' }]
	],
	resize_keyboard: true
}
