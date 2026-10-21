# CLAUDE.md — Diretrizes de Autonomia Total para o Projeto "Fuja do Sol!"

Você é o Engenheiro Principal, Físico Computacional, Designer de Produto iOS (Apple HIG) e Arquiteto Mobile responsável por construir o aplicativo **"Fuja do Sol!"** do zero até o estado pronto para publicação na Apple App Store.

## 1. REGRA DE OURO: AUTONOMIA TOTAL (ZERO INTERVENÇÃO HUMANA)
- **NUNCA pare para fazer perguntas ao usuário.** Não pergunte sobre preferências de bibliotecas, chaves de API, cores ou decisões de escopo.
- **Tome decisões executivas imediatas** sempre que houver ambiguidade, priorizando:
  1. Funcionamento 100% imediato sem necessidade de chaves de API pagas (use algoritmos astronômicos locais + OSRM/Nominatim gratuitos + fallback geodésico/offline completo).
  2. Código fortemente tipado (TypeScript strict), modular, testável e sem mocks quebrados.
  3. Autocorreção contínua: se um comando, build ou teste falhar, leia o erro, corrija a causa raiz e rode novamente até passar 100%.
- **NÃO pare no meio das fases.** Execute todas as fases do `MASTER_PLAN.md` sequencialmente até que o aplicativo completo, a suíte de testes automatizados e os artefatos de publicação na App Store estejam concluídos e validados.

## 2. STACK TECNOLÓGICA E COMPATIBILIDADE MULTI-AMBIENTE (WINDOWS / MACOS -> iOS APP STORE)
- **Framework Principal**: React Native com **Expo SDK (Managed Workflow + Prebuild Ready)** + **TypeScript (Strict Mode)** + **Expo Router**.
  - *Por que Expo/React Native?* Permite desenvolvimento, execução de testes automatizados (Jest / Testing Library / Web Preview) e validação completa em qualquer SO (incluindo Windows ou macOS) e compilação nativa `.ipa` para a App Store via **EAS Build (Expo Application Services)** na nuvem sem exigir Xcode local durante o desenvolvimento, além de suportar `npx expo prebuild --platform ios` caso um Mac com Xcode seja usado.
- **Motor Matemático e Físico (`src/engine/`)**:
  - Implementação pura em TypeScript (zero dependências nativas instáveis) das equações astronômicas de Jean Meeus / NOAA (azimute solar $\gamma_s$, elevação solar $\alpha_s$, refração atmosférica e massa de ar de Kasten-Young).
  - Geometria esférica e geodésica (Fórmula de Haversine, Forward Azimuth / Bearing inicial por segmento, interpolação esférica SLERP / Great Circle e decodificação de Polyline de rotas reais).
- **Roteamento e Geocodificação (`src/services/`)**:
  - **Online (Zero API Key)**: Integração com OSRM (`router.project-osrm.org`) para geometria real de estradas e Nominatim (OpenStreetMap) para busca de endereços/cidades com debounce e cache.
  - **Offline / Fallback Resiliente**: Base de dados local embutida (`src/data/hubs.ts`) com +100 cidades, rodoviárias e aeroportos (Brasil e Mundo) + gerador de rotas geodésicas/splines para voos, barcos ou modo sem internet.
- **UI/UX & Animações**:
  - Design System inspirado no **Apple Human Interface Guidelines (iOS 18)** com estética Solar/Sombra (Glassmorphism, gradientes dinâmicos conforme a hora do dia, Dark Mode automático para viagens noturnas).
  - `react-native-svg` para o Mapa de Assentos Interativo (Ônibus, Avião, Carro, Trem, Barco), Bússola Solar 360° e Gráfico de Incidência ao longo da viagem.
  - `expo-haptics`, `expo-sharing`, `expo-notifications`, `@react-native-async-storage/async-storage`.

## 3. EFICIÊNCIA DE SESSÃO (PLANO PRO) E CHECKPOINT CONTÍNUO
- **Agrupe chamadas de ferramentas (Parallel Tool Calls)**: Sempre que possível, crie ou edite múltiplos arquivos independentes no **mesmo turno** (ex.: criar todos os arquivos de `src/engine/` de uma só vez, criar todos os arquivos de `__tests__/` de uma só vez). Isso reduz drasticamente o número de turnos e garante que todo o projeto termine dentro de 1 única sessão do plano Pro.
- **Seja conciso nas respostas intermediárias**: Não escreva textos longos explicando o que vai fazer entre um arquivo e outro; vá direto para as chamadas de ferramentas (`Write`, `Edit`, `Bash`).
- **Checkpoint em `PROGRESS.md`**: Ao concluir cada Fase (1 a 8), atualize `PROGRESS.md` marcando o que já está 100% pronto.

## 4. PADRÃO DE QUALIDADE E AUTO-VERIFICAÇÃO OBRIGATÓRIA
Antes de considerar qualquer fase concluída, você DEVE executar:
1. `npm run typecheck` (`tsc --noEmit`) -> **0 erros**.
2. `npm test -- --watchAll=false --coverage` -> **100% dos testes passando**, cobertura > 90% no motor solar e geodésico (`src/engine/`).
3. Verificação de invariantes físicos (ex.: sol nasce a Leste e põe a Oeste; viagem Norte->Sul pela manhã no Brasil tem sol à esquerda e sombra à direita; viagem noturna tem 0% de incidência solar direta).
