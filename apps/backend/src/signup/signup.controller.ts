import { Body, Controller, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../common/decorators/public.decorator";
import { SignupDto } from "./dto/signup.dto";
import { SignupService } from "./signup.service";

// Sem e-mail de verificação e sem cartão, criar conta é grátis: o limite por IP é a principal
// defesa contra cadastro em massa (ocupar e-mails alheios, spam de tenants). 5/hora por IP, bem
// mais estrito que os 10/min das demais rotas públicas. O contador é em memória (um processo);
// atrás de proxy é obrigatório definir TRUST_PROXY_HOPS, senão todos os clientes dividem o limite.
// O frontend chama esta rota DIRETO do navegador (publicApi.signup): por Server Action o backend
// só veria o IP do servidor Next e o limite valeria para o produto inteiro.
const SIGNUP_THROTTLE = { default: { limit: 5, ttl: 60 * 60_000 } };

@Controller("public/signup")
export class SignupController {
  constructor(private readonly signupService: SignupService) {}

  @Public()
  @Throttle(SIGNUP_THROTTLE)
  @Post()
  signup(@Body() dto: SignupDto) {
    return this.signupService.signup(dto);
  }
}
