# Guia de publicação na App Store — Fuja do Sol!

Este guia leva o projeto do código até a App Store usando **EAS Build** (compilação iOS na nuvem da Expo). Funciona a partir do **Windows**, macOS ou Linux — não é preciso ter um Mac nem Xcode.

---

## 0. Pré-requisitos (uma vez só)

| Item | Onde | Observação |
|---|---|---|
| Apple Developer Program | <https://developer.apple.com/programs/> | US$ 99/ano. A aprovação da conta pode levar de horas a 2 dias. |
| Conta Expo (gratuita) | <https://expo.dev/signup> | O plano gratuito inclui builds iOS na fila padrão. |
| Node.js 20+ | <https://nodejs.org> | Já usado para rodar o projeto. |
| EAS CLI | `npm install -g eas-cli` | Ou use `npx eas-cli` em cada comando. |

```bash
npm install
npm run typecheck
npm test -- --watchAll=false --coverage
```

Os três comandos devem terminar sem erros antes de qualquer build.

---

## 1. Login e vínculo do projeto

```bash
npx eas-cli login
npx eas-cli init
```

`eas init` cria o projeto na sua conta Expo e grava `extra.eas.projectId` no `app.json`. Faça commit dessa alteração.

## 2. Conferir identidade do app

No `app.json` (já configurado):

- `expo.name`: **Fuja do Sol!**
- `expo.ios.bundleIdentifier`: **com.fujadosol.app** — se já estiver em uso por outra conta, troque por algo único (ex.: `com.seunome.fujadosol`) **antes** do primeiro build.
- `expo.version`: `1.0.0` (versão de marketing) — a `buildNumber` é incrementada automaticamente pelo perfil `production` (`autoIncrement` + `appVersionSource: remote`).
- Ícone 1024×1024 **sem transparência**: `assets/icon.png` (regenerável com `npm run generate:assets`).

## 3. Criar o app no App Store Connect

1. Acesse <https://appstoreconnect.apple.com> → **Apps** → **+** → **Novo app**.
2. Plataforma **iOS**, nome **Fuja do Sol!**, idioma principal **Português (Brasil)**, Bundle ID **com.fujadosol.app** (se não aparecer na lista, o EAS cria automaticamente no passo 4; volte aqui depois), SKU `fujadosol-ios-001`, acesso **Total**.
3. Anote o **Apple ID do app** (número em *Informações do app*). Opcionalmente coloque-o em `eas.json` → `submit.production.ios.ascAppId` para pular perguntas no `eas submit`.

## 4. Build de produção na nuvem

```bash
npx eas-cli build --platform ios --profile production
```

Na primeira vez o EAS pergunta:

- **Login na Apple** → use o Apple ID da conta de desenvolvedor (com 2FA).
- **Gerar Distribution Certificate e Provisioning Profile?** → **Sim** (o EAS gerencia e guarda com segurança).
- **Push Notifications key?** → pode responder **Não**: o app usa apenas notificações **locais** (alertas de cortina), que não precisam de APNs key.

Ao final você recebe um link com o `.ipa` assinado (≈ 15–30 min na fila gratuita).

> Builds de teste: `--profile preview` gera um `.ipa` de distribuição interna (instalação via link em aparelhos registrados) e `--profile development` gera um build para o Simulador com `expo-dev-client`.

## 5. Envio para o TestFlight / App Store Connect

```bash
npx eas-cli submit --platform ios --profile production --latest
```

O EAS pede (ou reutiliza) uma **App Store Connect API Key** — aceite que ele crie uma. Após o upload, a Apple processa o build (5–30 min) e ele aparece em **TestFlight**.

Atalho equivalente já configurado: `npm run build:ios` e `npm run submit:ios`.

## 6. Preencher a página da App Store

Use os textos prontos em:

- `appstore/metadata-pt-BR.json` (idioma principal)
- `appstore/metadata-en-US.json` (adicione o idioma **Inglês (EUA)** em *Localizações*)

| Campo no App Store Connect | Chave no JSON |
|---|---|
| Nome | `name` |
| Subtítulo (30 caracteres) | `subtitle` |
| Texto promocional (170) | `promotionalText` |
| Descrição | `description` |
| Palavras-chave (100) | `keywords` |
| URL de suporte | `supportUrl` |
| URL de marketing | `marketingUrl` |
| URL da política de privacidade | `privacyPolicyUrl` |
| Notas para o revisor | `reviewNotes` |
| Categoria primária / secundária | `primaryCategory` / `secondaryCategory` |
| Novidades desta versão | `whatsNew` |

**Política de privacidade:** publique `appstore/PRIVACY_POLICY.md` em uma URL pública (GitHub Pages, Notion público, site próprio) e use essa URL nos campos `privacyPolicyUrl` e de suporte. A Apple rejeita URLs que não abrem.

### Classificação etária
Responda **"Nenhum"** a todos os itens → classificação **4+**.

### Privacidade do app (rótulo "Nutrition Label")
Selecione **"Não coletamos dados deste app"**. Justificativa (detalhada na política): todos os cálculos acontecem no aparelho; não há conta, analytics, anúncios ou rastreamento. Consultas de rota/endereço vão para os servidores públicos do OpenStreetMap apenas para responder à solicitação em tempo real e não são vinculadas ao usuário — e podem ser desligadas em *Salvos → Ajustes*.

### Capturas de tela
Obrigatório: **iPhone 6,9"** (1320×2868 ou 1290×2796). O iPad não é necessário porque `supportsTablet` está `false`.

Sugestão de 5 telas (gere no Simulador com `--profile development` ou em um iPhone real via TestFlight):
1. **Simular** com o veredito "Sente do lado ESQUERDO — 57% mais fresco" (preset Via Dutra).
2. **Raio-X** com a bússola solar e o mapa da rota colorido.
3. **Assentos** do ônibus com o selo ★ Melhor Assento.
4. **Horários** com o gráfico de 24 h e o Horário Campeão de Sombra.
5. **Bilhete de Sombra** (cartão compartilhável).

Legendas sugeridas: "Saiba de que lado sentar", "O sol minuto a minuto", "O melhor assento, calculado", "Descubra o horário mais fresco", "Compartilhe com quem vai junto".

## 7. Enviar para revisão

1. Em **App Store → versão 1.0.0**, selecione o build vindo do TestFlight.
2. Preencha **Informações de revisão**: contato, telefone, e cole `reviewNotes`. Não há login, então **não** é preciso conta demo.
3. **Controle de exportação:** o app já declara `ITSAppUsesNonExemptEncryption = false` (só HTTPS padrão).
4. Clique em **Adicionar para revisão** → **Enviar**. Prazo típico: 24–48 h.

## 8. Atualizações futuras

```bash
# altere expo.version no app.json (ex.: 1.0.1), depois:
npx eas-cli build -p ios --profile production
npx eas-cli submit -p ios --profile production --latest
```

## Solução de problemas

| Sintoma | Causa provável / correção |
|---|---|
| `Bundle identifier is not available` | Outro time já usa `com.fujadosol.app`; troque no `app.json` e refaça o build. |
| Build falha em `pod install` | Rode `npx expo install --check` para alinhar versões ao SDK e tente de novo. |
| "Missing compliance" no TestFlight | Confirme `ITSAppUsesNonExemptEncryption: false` em `ios.infoPlist`. |
| Rejeição 2.1 (crash) | Teste o build `preview` num iPhone real antes de enviar. |
| Rejeição 5.1.1 (permissão) | Os textos de `NSLocationWhenInUseUsageDescription` já explicam o uso; a localização é opcional (o app funciona sem ela). |
| Rejeição 4.2 (funcionalidade mínima) | Destaque nas notas o motor astronômico local, mapas de assentos de 5 modais, otimizador de 24 h, alertas e modo offline. |
