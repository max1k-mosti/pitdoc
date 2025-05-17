import { CallbackQuery, Hears, Start, Update } from '@grammyjs/nestjs'
import { Injectable } from '@nestjs/common'
import { Context } from 'grammy'
import { MyContext, TelegramService } from './telegram.service'

@Update()
@Injectable()
export class TelegramUpdate {
	constructor(private readonly telegramService: TelegramService) {}

	@Start()
	async onStart(ctx: Context) {
		await this.telegramService.sendWelcomeMessage(ctx)
	}

	@Hears('💳 Сформувати рахунок')
	async onCreateCheck(ctx: Context) {
		await this.telegramService.proccessCreateCheck(ctx)
	}
	@Hears('📝 Сформувати акт')
	async onCreateAct(ctx: Context) {
		await this.telegramService.proccessCreateAct(ctx)
	}
	@CallbackQuery(/^create_check$/)
	async onCreateAnotherCheck(ctx: Context) {
		await this.telegramService.proccessCreateCheck(ctx)
	}
	@CallbackQuery(/^company:/)
	async onCompanySelected(ctx: MyContext) {
		await this.telegramService.setCompanyForCheck(ctx)
	}
	@CallbackQuery(/^booking:/)
	async onBookingSelected(ctx: MyContext) {
		await this.telegramService.setBookingForCheck(ctx)
	}
	@CallbackQuery(/^check:/)
	async onCheckSelected(ctx: Context) {
		await this.telegramService.proccessGenerateAct(ctx)
	}
	@CallbackQuery(/^generate_check$/)
	async generateCheck(ctx: MyContext) {
		await this.telegramService.proccessGenerateCheck(ctx)
	}
	@CallbackQuery(/^download_check:/)
	async onDownloadCheck(ctx: Context) {
		await this.telegramService.downloadCheck(ctx)
	}
	@CallbackQuery(/^download_act:/)
	async onDownloadAct(ctx: Context) {
		await this.telegramService.downloadAct(ctx)
	}
	@CallbackQuery(/^add_more$/)
	async addMoreBookingInSelected(ctx: MyContext) {
		await this.telegramService.addMoreBookingInSelected(ctx)
	}
}
