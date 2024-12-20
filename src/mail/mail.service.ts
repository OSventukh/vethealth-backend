import path from 'path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nContext } from 'nestjs-i18n';

import { MailData } from './interfaces/mail-data.interface';
import { AllConfigType } from '@/config/config.type';
import { MailerService } from '@/mailer/mailer.service';

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async userSignUp(mailData: MailData<{ hash: string }>): Promise<void> {
    const i18n = I18nContext.current();
    let emailConfirmTitle: string | undefined;
    let text1: string | undefined;
    let text2: string | undefined;
    let text3: string | undefined;

    if (i18n) {
      [emailConfirmTitle, text1, text2, text3] = await Promise.all([
        i18n.t('common.confirmEmail'),
        i18n.t('confirm-email.text1'),
        i18n.t('confirm-email.text2'),
        i18n.t('confirm-email.text3'),
      ]);
    }

    await this.mailerService.sendMail({
      to: mailData.to,
      subject: emailConfirmTitle,
      text: `${this.configService.get('app.frontendDomain', {
        infer: true,
      })}/auth/confirmation?hash=${mailData.data.hash} ${emailConfirmTitle}`,
      templatePath: path.join(
        __dirname,
        'mail-templates',
        'activation.hbs',
      ),
      context: {
        title: emailConfirmTitle,
        url: `${this.configService.get('app.frontendDomain', {
          infer: true,
        })}/auth/confirmation?hash=${mailData.data.hash}`,
        actionTitle: emailConfirmTitle,
        app_name: this.configService.get('app.name', { infer: true }),
        text1,
        text2,
        text3,
      },
    });
  }

  async forgotPassword(mailData: MailData<{ hash: string }>): Promise<void> {
    const i18n = I18nContext.current();
    let resetPasswordTitle: string | undefined;
    let text1: string | undefined;
    let text2: string | undefined;
    let text3: string | undefined;
    let text4: string | undefined;

    if (i18n) {
      [resetPasswordTitle, text1, text2, text3, text4] = await Promise.all([
        i18n.t('common.resetPassword'),
        i18n.t('reset-password.text1'),
        i18n.t('reset-password.text2'),
        i18n.t('reset-password.text3'),
        i18n.t('reset-password.text4'),
      ]);
    }

    await this.mailerService.sendMail({
      to: mailData.to,
      subject: resetPasswordTitle,
      text: `${this.configService.get('app.frontendDomain', {
        infer: true,
      })}/auth/confirmation?hash=${mailData.data.hash} ${resetPasswordTitle}`,
      templatePath: path.join(
        __dirname,
        'mail-templates',
        'reset-password.hbs',
      ),
      context: {
        title: resetPasswordTitle,
        url: `${this.configService.get('app.frontendDomain', {
          infer: true,
        })}/auth/confirmation?hash=${mailData.data.hash}`,
        actionTitle: resetPasswordTitle,
        app_name: this.configService.get('app.name', {
          infer: true,
        }),
        text1,
        text2,
        text3,
        text4,
      },
    });
  }

  async changePassword(mailData: { to: string }): Promise<void> {
    const i18n = I18nContext.current();
    let changePasswordTitle: string | undefined;
    let text1: string | undefined;
    let text2: string | undefined;
    let text3: string | undefined;

    if (i18n) {
      [changePasswordTitle, text1, text2, text3] = await Promise.all([
        i18n.t('common.changePassword'),
        i18n.t('change-password.text1'),
        i18n.t('change-password.text2'),
        i18n.t('change-password.text3'),
      ]);
    }

    await this.mailerService.sendMail({
      to: mailData.to,
      subject: changePasswordTitle,
      templatePath: path.join(
        __dirname,
        'mail-templates',
        'change-password.hbs',
      ),
      context: {
        title: changePasswordTitle,
        actionTitle: changePasswordTitle,
        app_name: this.configService.get('app.name', {
          infer: true,
        }),
        text1,
        text2,
        text3,
      },
    });
  }
}
