import { InjectBot } from '@grammyjs/nestjs'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { format } from 'date-fns'
import * as fs from 'fs'
import {
	Bot,
	Context,
	InlineKeyboard,
	InputFile,
	session,
	SessionFlavor
} from 'grammy'
import { NotionService } from 'src/notion/notion.service'
import { IAct, ICheck } from 'src/services/documents.interface'
import { DocumentsService } from 'src/services/documents.service'
import { MENU } from './menu.config'
interface SessionData {
	allBookings: any[]
	selectedBookings: any[]
}
export type MyContext = Context & SessionFlavor<SessionData>
@Injectable()
export class TelegramService {
	private readonly botToken: string
	constructor(
		@InjectBot() private readonly bot: Bot<Context>,
		private readonly configService: ConfigService,
		private readonly notionService: NotionService,
		private readonly documentsService: DocumentsService
	) {
		this.botToken = configService.get<string>('TELEGRAM_BOT_TOKEN')
		bot.use(
			session({
				initial: (): SessionData => ({
					selectedBookings: [],
					allBookings: []
				})
			})
		)
	}

	async sendWelcomeMessage(ctx: Context) {
		const MESSAGE = `Привіт\\! 👋 Я твій помічник, готовий допомогти тобі в будь\\-який час\\.\n
		
		👇 Вибери один із пунктів меню нижче, щоб продовжити:\n
		1️⃣ *💳 Сформувати рахунок* \– якщо ти хочеш отримати чек\\.\n
		2️⃣ *📝 Сформувати акт* \– якщо тобі потрібно сформувати акт\\.\n
		
		Натискай кнопку, яка тобі потрібна, і я зроблю все необхідне\\!`

		await ctx.reply(MESSAGE, {
			reply_markup: MENU,
			parse_mode: 'MarkdownV2'
		})
	}

	async proccessCreateCheck(ctx: Context) {
		const COMPANIES = await this.notionService.getCompanies()

		const keyboard = this.createKeyboard(COMPANIES, 'company')

		await ctx.reply('🔄 Завантажую список компаній...', {
			reply_markup: { remove_keyboard: true }
		})

		await ctx.reply(
			'📁 Оберіть компанію, для якої потрібно сформувати рахунок:',
			{
				reply_markup: keyboard
			}
		)
	}
	async proccessCreateAct(ctx: Context) {
		const CHECKS_response = await this.notionService.getChecksWithoutActs()
		if (!CHECKS_response) {
			await ctx.reply(
				'Усі рахунки вже мають сформовані акти. Нових рахунків немає 📁',
				{
					reply_markup: { remove_keyboard: true }
				}
			)
		}
		const CHECKS = CHECKS_response.map(check => {
			return {
				id: check.id,
				name: check.name,
				number: this.generateDocumentCode(check.number)
			}
		})
		const keyboard = this.createKeyboard(CHECKS, 'check')
		await ctx.reply('🧾 Оберіть рахунок, для якого потрібно сформувати акт:', {
			reply_markup: keyboard
		})
	}

	async setCompanyForCheck(ctx: MyContext) {
		const companyId = ctx.callbackQuery.data.split(':')[1]
		const BOOKINGS = await this.notionService.getCompanyBookings(companyId)

		await ctx.reply('🔄 Завантаження бронювань компанії...', {
			reply_markup: { remove_keyboard: true }
		})

		if (BOOKINGS.length === 0) {
			await ctx.reply('У цієї компанії немає бронювань без рахунків 🧾')
		} else {
			ctx.session.allBookings = BOOKINGS
			const keyboard = this.createKeyboard(
				BOOKINGS,
				'booking',
				ctx.session.selectedBookings
			)

			await ctx.answerCallbackQuery()
			await ctx.reply(
				`🗂 Оберіть одне або кілька бронювань для формування рахунку:`,
				{
					reply_markup: keyboard
				}
			)
		}
	}
	async setBookingForCheck(ctx: MyContext) {
		const bookingId = ctx.callbackQuery.data.split(':')[1]

		const isSelected = ctx.session.selectedBookings.some(
			b => b.id === bookingId
		)
		if (isSelected) {
			ctx.session.selectedBookings = ctx.session.selectedBookings.filter(
				b => b.id !== bookingId
			)
		} else {
			const booking = ctx.session.allBookings?.find(b => b.id === bookingId)
			ctx.session.selectedBookings.push(booking)
		}

		const BOOKINGS = ctx.session.selectedBookings
		const keyboard = this.createKeyboard(
			BOOKINGS,
			'booking',
			ctx.session.selectedBookings
		)
		keyboard.text('🧾 Сформувати рахунок', 'generate_check')
		keyboard.text('➕ Додати ще бронювання', 'add_more')
		await ctx.answerCallbackQuery()
		await ctx.editMessageReplyMarkup({ reply_markup: keyboard })
	}
	async proccessGenerateAct(ctx: Context) {
		const checkID = ctx.callbackQuery.data.split(':')[1]
		const check_response = await this.notionService.getCheckById(checkID)
		const ActData: IAct = {
			customer: {
				title: check_response.customer.title,
				code: check_response.customer.code,
				address: check_response.customer.address,
				manager: check_response.customer.manager
			},
			period: check_response.period,
			date: check_response.date,
			bookings: check_response.bookings,
			number: this.generateDocumentCode(check_response.number),
			total_sum: check_response.total_sum
		}

		await this.documentsService.generateAct(ActData)
		await this.notionService.createAct(
			check_response.bookings.map(item => item.id),
			check_response.customer.id,
			check_response.number,
			checkID
		)
		const keyboard = [
			[
				{
					text: '📥 Завантажити акт',
					callback_data: `download_act:`
				}
			]
		]
		ctx.reply('🎉 Ваш акт готовий! Натисніть кнопку, щоб завантажити:', {
			reply_markup: { inline_keyboard: keyboard }
		})
	}
	async proccessGenerateCheck(ctx: MyContext) {
		const BOOKING_DATA = ctx.session.selectedBookings
		let totalSum: number = 0
		for (const booking of BOOKING_DATA) {
			totalSum += booking.price * booking.nights
		}
		const DOCUMENT_LAST_NUMBER = await this.notionService.getLastNumber()
		const DOCUMENT_NUMBER = this.generateDocumentCode(DOCUMENT_LAST_NUMBER + 1)
		const COMPANY_DATA = await this.notionService.getCompanyByID(
			BOOKING_DATA[0].companyId
		)
		const CheckData: ICheck = {
			number: DOCUMENT_NUMBER,
			customer: {
				title: COMPANY_DATA.properties.Name.title[0].plain_text,
				code: COMPANY_DATA.properties['ЄДРПОУ'].number,
				address: COMPANY_DATA.properties.Address.rich_text[0].plain_text
			},
			date: format(new Date(), 'dd.MM.yyyy'),
			bookings: BOOKING_DATA,
			total_sum: totalSum
		}

		await this.documentsService.generateCheck(CheckData)
		await this.notionService.createCheck(
			BOOKING_DATA.map(item => item.id),
			BOOKING_DATA[0].companyId,
			DOCUMENT_LAST_NUMBER
		)
		ctx.session.allBookings = []
		ctx.session.selectedBookings = []
		const keyboard = [
			[
				{
					text: '📥 Завантажити рахунок',
					callback_data: `download_check:`
				}
			],
			[
				{
					text: '💳 Сформувати інший рахунок',
					callback_data: `create_check`
				}
			]
		]
		ctx.reply('🎉 Ваш рахунок готовий! Натисніть кнопку, щоб завантажити:', {
			reply_markup: { inline_keyboard: keyboard }
		})
	}
	async downloadCheck(ctx: Context) {
		const filePath = 'Рахунок.pdf'
		if (fs.existsSync(filePath)) {
			try {
				const document = await ctx.replyWithDocument(new InputFile(filePath), {
					caption: '🎉 Ваш рахунок готовий до завантаження!'
				})
			} catch (error) {
				console.error('❗ Помилка при відправці файлу:', error)
				await ctx.reply(
					'❗ Сталася помилка при спробі завантажити рахунок. Спробуйте ще раз пізніше.'
				)
			}
		} else {
			console.error('⚠️ Файл не знайдений:', filePath)
			await ctx.reply(
				'⚠️ Вибачте, рахунок не знайдений. Спробуйте ще раз пізніше.'
			)
		}
	}
	async downloadAct(ctx: Context) {
		const filePath = 'Акт.pdf'
		if (fs.existsSync(filePath)) {
			try {
				const document = await ctx.replyWithDocument(new InputFile(filePath), {
					caption: '🎉 Ваш акт готовий до завантаження!'
				})
			} catch (error) {
				console.error('❗ Помилка при відправці файлу:', error)
				await ctx.reply(
					'❗ Сталася помилка при спробі завантажити акт. Спробуйте ще раз пізніше.'
				)
			}
		} else {
			console.error('⚠️ Файл не знайдений:', filePath)
			await ctx.reply('⚠️ Вибачте, кат не знайдений. Спробуйте ще раз пізніше.')
		}
	}
	async addMoreBookingInSelected(ctx: MyContext) {
		const keyboard = this.createKeyboard(
			ctx.session.allBookings,
			'booking',
			ctx.session.selectedBookings
		)

		await ctx.answerCallbackQuery()
		await ctx.reply(
			`🗂 Оберіть ще одне або кілька бронювань для формування рахунку:`,
			{
				reply_markup: keyboard
			}
		)
	}

	private createKeyboard(items: any[], prefix: string, selected?: any[]) {
		const keyboard = new InlineKeyboard()
		items.forEach(item => {
			const isSelected = selected
				? selected.some(selected => selected.id === item.id)
				: false
			const status = selected ? (isSelected ? '✅ Обрано' : '➕ Обрати') : ''
			const displayText = `${item.number ? item.number : ''} ${item.name} ${selected ? status : ''}`
			keyboard.text(displayText, `${prefix}:${item.id}`), keyboard.row()
		})
		return keyboard
	}
	private generateDocumentCode(number: number) {
		const currentYearShort = new Date()
			.getFullYear()
			.toString()
			.slice(-2)
			.padStart(3, '0')
		return `${currentYearShort}/${number}`
	}
}
