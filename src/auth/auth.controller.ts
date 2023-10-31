import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Body,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthLoginDto } from './dto/auth-login.dto';
import { AuthRegisterDto } from './dto/auth-register.dto';
import { AuthConfirmDto } from './dto/auth-confirm.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() authDto: AuthLoginDto) {
    return this.authService.validateLogin(authDto);
  }

  logout() {
    this.authService.logout();
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() registerDto: AuthRegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  confirmEmail(@Body() confirmDto: AuthConfirmDto) {
    return this.authService.confirm(confirmDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  forgotPassword() {
    return this.authService.forgorPassword();
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword() {
    return this.authService.resetPassword();
  }

  @Get('current-user')
  @HttpCode(HttpStatus.OK)
  currentUser() {
    return this.authService.getCurrentUser();
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh() {
    this.authService.refreshTokens();
  }
}
