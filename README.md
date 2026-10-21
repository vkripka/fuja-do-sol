# ☀️ Fuja do Sol!

App iOS (React Native + Expo SDK 58 + TypeScript strict + Expo Router) que diz **de que lado sentar** em viagens de ônibus, avião, carro, trem ou barco para fugir do sol — ou para ver o pôr do sol.

## Rodar

```bash
npm install
npm start            # Expo Dev Server (i = simulador iOS no Mac, w = navegador)
npm run web          # preview no navegador
```

## Qualidade

```bash
npm run typecheck                         # tsc --noEmit (0 erros)
npm test -- --watchAll=false --coverage   # 157 testes, motor ≈ 99,5% de cobertura
```

## Publicar na App Store (funciona no Windows)

```bash
npx eas-cli login
npx eas-cli init
npm run build:ios    # eas build -p ios --profile production
npm run submit:ios   # eas submit -p ios --profile production
```

Passo a passo completo, textos da loja, política de privacidade e checklist em [`appstore/`](appstore/APP_STORE_CONNECT_GUIDE.md).

## Arquitetura

| Pasta | Conteúdo |
|---|---|
| `src/engine/` | Motor puro em TS: posição solar (Meeus/NOAA), geodésia, discretização da rota, exposição por janela, assentos, otimizador de horário, fusos |
| `src/services/` | OSRM (rotas), Nominatim (busca), AsyncStorage, notificações/compartilhamento/localização |
| `src/data/` | 160+ locais offline e 10 viagens famosas |
| `src/components/` | Bússola solar, mapa de assentos, mapa da rota, linha do tempo, gráfico de horários, bilhete |
| `app/` | Expo Router: abas Simular, Raio-X, Assentos, Horários, Salvos |
| `scripts/generate-assets.js` | Gera ícone/splash sem dependências (`npm run generate:assets`) |
