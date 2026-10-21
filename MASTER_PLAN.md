# MASTER PLAN: Aplicativo iOS "Fuja do Sol!" ☀️🚌✈️🚗

Este documento é a especificação técnica e funcional completa para a criação autônoma do aplicativo **"Fuja do Sol!"**, projetado para iPhone (App Store) e estruturado para ser implementado de ponta a ponta pelo Claude Opus sem intervenção humana.

---

## 1. Visão do Produto & Proposta de Valor
Viajantes de ônibus, carro, trem, avião ou barco frequentemente escolhem um assento sem saber que ficarão horas sob incidência direta de sol na janela — sofrendo com calor térmico, ofuscamento visual e radiação UVA.

O **"Fuja do Sol!"** resolve isso com precisão astronômica e geodésica:
- O usuário informa: **Origem**, **Destino**, **Data/Horário de Partida**, **Duração Estimada** e **Meio de Transporte** (Ônibus, Avião, Carro, Trem/Metrô, Barco/Balsa).
- O aplicativo reconstrói a geometria real da rota (curvas de rodovias via Polyline ou rota geodésica de voo), divide o trajeto em dezenas de micro-segmentos espaço-temporais $(x_i, y_i, t_i)$ e calcula a posição exata do Sol (Azimute e Elevação) em cada minuto da viagem.
- Como resultado, entrega:
  1. **Veredito Imediato**: Qual lado tem mais **Sombra** (ex.: *"Sente do Lado Direito — 84% na Sombra"*) e qual lado recebe mais **Sol**.
  2. **Mapa de Assentos Interativo com Heatmap**: Layout real do veículo escolhido destacando os melhores assentos e o selo **"Melhor Assento da Viagem"**.
  3. **Linha do Tempo Minuto a Minuto**: Indica exatamente em qual trecho da viagem o sol muda de lado ou se põe.
  4. **Otimizador de Horário ("E se eu sair outra hora?")**: Simulador de partida para encontrar o horário mais fresco.

---

## 2. Motor Físico, Astronômico e Geodésico (`src/engine/`)

### 2.1. Discretização Espaço-Temporal da Rota (`routeDiscretizer.ts`)
Uma viagem entre $A$ e $B$ não é uma linha reta (especialmente em estradas).
- Dada uma sequência de coordenadas da rota $P = [p_0, p_1, \dots, p_M]$ com distância acumulada $D_{\text{total}}$, dividimos a viagem em $N = \text{clamp}(\lfloor \text{duraçãoMinutos} / 2 \rfloor, 24, 120)$ pontos amostrais uniformes na distância.
- Para cada segmento $i \in \{0, \dots, N-1\}$:
  - Fração do percurso: $f_i = \frac{i + 0.5}{N}$
  - Instante temporal exato: $t_i = t_{\text{partida}} + f_i \cdot \Delta t_{\text{viagem}}$
  - Ponto inicial $A_i = (\varphi_1, \lambda_1)$ e ponto final $B_i = (\varphi_2, \lambda_2)$ do segmento.

### 2.2. Azimute de Deslocamento do Veículo (`geodesic.ts`)
O vetor direção do veículo (Forward Bearing $\theta_{\text{vec}, i} \in [0^\circ, 360^\circ)$, medido no sentido horário a partir do Norte verdadeiro) é dado por:
$$\Delta\lambda = \lambda_2 - \lambda_1$$
$$y = \sin(\Delta\lambda) \cdot \cos(\varphi_2)$$
$$x = \cos(\varphi_1)\cdot\sin(\varphi_2) - \sin(\varphi_1)\cdot\cos(\varphi_2)\cdot\cos(\Delta\lambda)$$
$$\theta_{\text{vec}, i} = (\text{atan2}(y, x) \cdot \frac{180}{\pi} + 360) \bmod 360$$

### 2.3. Posição Astronômica do Sol (`solarPosition.ts`)
Baseado nas equações astronômicas de **Jean Meeus / NOAA**:
1. Converter $t_i$ (UTC) para Dia Juliano ($JD$) e Século Juliano ($T = \frac{JD - 2451545.0}{36525}$).
2. Calcular a Longitude Média Geométrica do Sol ($L_0$), Anomalia Média ($M$), Equação do Centro ($C$), Longitude Verdadeira ($\odot$), Obliquidade da Eclíptica ($\varepsilon$), Ascensão Reta ($\alpha$) e Declinação Solar ($\delta$).
3. Calcular o Tempo Sideral de Greenwich ($\theta_{\text{GMST}}$) e o Ângulo Horário Local ($H$).
4. Obter a **Elevação Solar ($\alpha_{\text{sun}}$)**:
   $$\sin(\alpha_{\text{sun}}) = \sin(\varphi)\sin(\delta) + \cos(\varphi)\cos(\delta)\cos(H)$$
   - Ajustar para refração atmosférica quando $\alpha_{\text{sun}} > -0.833^\circ$.
   - **Ajuste de Altitude para Avião**: Em cruzeiro ($h \approx 11.000\text{ m}$), a depressão do horizonte é $\Delta\alpha_{\text{horiz}} \approx 1.92^\circ \sqrt{h_{\text{km}}} \approx +3.3^\circ$, fazendo o pôr do sol acontecer mais tarde e o nascer mais cedo!
5. Obter o **Azimute Solar ($\gamma_{\text{sun}} \in [0^\circ, 360^\circ)$ a partir do Norte)**:
   $$\gamma_{\text{sun}} = (\text{atan2}(\sin(H),\ \cos(H)\sin(\varphi) - \tan(\delta)\cos(\varphi)) \cdot \frac{180}{\pi} + 180) \bmod 360$$

### 2.4. Ângulo Relativo ao Veículo e Irradiância Lateral Efetiva (`exposureCalculator.ts`)
1. **Ângulo Relativo ($\Delta\psi_i \in [-180^\circ, +180^\circ)$)**:
   $$\Delta\psi_i = (\gamma_{\text{sun}, i} - \theta_{\text{vec}, i} + 540^\circ) \bmod 360^\circ - 180^\circ$$
   - Se $\Delta\psi_i \in (0^\circ, +180^\circ)$: Sol incide pela **DIREITA (Estribordo)**.
   - Se $\Delta\psi_i \in (-180^\circ, 0^\circ)$: Sol incide pela **ESQUERDA (Bombordo)**.
   - Componente frontal/traseira: $\cos(\Delta\psi_i) > 0$ indica sol pela **Frente (Para-brisa)**; $\cos(\Delta\psi_i) < 0$ indica sol por **Trás**.
2. **Fator de Penetração na Janela Lateral ($W_{\text{lat}, i}$)**:
   - Se $\alpha_{\text{sun}, i} \le 0^\circ$ (noite): $W_{\text{lat}, i} = 0$.
   - A transmissão atmosférica direta usa a Massa de Ar de Kasten-Young:
     $$AM_i = \frac{1}{\sin(\max(\alpha_{\text{sun}, i}, 0.5^\circ)) + 0.50572 \cdot (\max(\alpha_{\text{sun}, i}, 0.5^\circ) + 6.07995)^{-1.6364}}$$
     $$I_{\text{direta}, i} = 1.353 \cdot 0.7^{(AM_i^{0.678})}$$
   - O incômodo na janela lateral depende da projeção perpendicular à janela ($|\sin(\Delta\psi_i)|$) e do fator de bloqueio do teto do veículo (quando $\alpha_{\text{sun}} > 65^\circ$, o teto bloqueia parte do sol direto na janela):
     $$F_{\text{teto}}(\alpha_{\text{sun}}) = \cos(\alpha_{\text{sun}}) \cdot \text{clamp}\left(\frac{82^\circ - \alpha_{\text{sun}}}{35^\circ}, 0.15, 1.0\right)$$
     $$\text{ScoreLateral}_i = I_{\text{direta}, i} \cdot |\sin(\Delta\psi_i)| \cdot F_{\text{teto}}(\alpha_{\text{sun}, i})$$

---

## 3. Funcionalidades Diferenciadas ("Killer Features")
Para garantir aprovação tranquila na revisão da App Store (evitando rejeição pela *Guideline 4.2 - Minimum Functionality*) e encantar os usuários:

1. **Mapa de Assentos Interativo por Modal ("Seat Heatmap")**:
   - **Ônibus Rodoviário**: 44 lugares (fileiras 1 a 11, Janela Esquerda, Corredor Esquerdo, Corredor Direito, Janela Direita).
   - **Avião Comercial**: Fuselagem com cabines, indicação visual das asas (fileiras 10–18) e configuração 3x3 (A, B, C | D, E, F), diferenciando Janela, Meio e Corredor.
   - **Carro de Passeio**: 5 lugares (Motorista, Passageiro Frontal, Traseiro Esquerdo, Traseiro Central, Traseiro Direito) — considera também a incidência pelo **para-brisa frontal** e vidro traseiro!
   - **Trem / Metrô** e **Barco / Catamarã**.
   - Ao tocar em qualquer assento, abre um card detalhando: % de sombra daquele assento específico, índice de conforto térmico, nível estimado de radiação UVA na janela e visão do pôr/nascer do sol.
2. **Modo "Fuja do Sol" vs. Modo "Caçador de Pôr do Sol (Golden Hour)"**:
   - Chave seletora que permite inverter a lógica para fotógrafos ou passageiros de avião/ônibus litorâneo que querem saber exatamente de qual lado verão o nascer ou o pôr do sol sem pegar o sol escaldante do meio-dia.
3. **Otimizador "Melhor Horário para Viajar" (Simulador 24h)**:
   - Gráfico/Carrossel comparando a incidência solar caso a mesma viagem ocorra em diferentes horários do dia (ex.: a cada 1h ou 2h), destacando o horário de maior conforto térmico.
4. **Scrubber Interativo da Viagem (Mapa + Bússola Solar em Tempo Real)**:
   - Slider de progresso da viagem ($0\%$ a $100\%$) onde o usuário arrasta o dedo e vê:
     - O veículo se movendo pela rota.
     - O vetor do Sol girando ao redor do veículo com indicação de elevação ($\alpha_{\text{sun}}$) e direção dos raios solares.
     - O status instantâneo (*"15:40 — Próximo a São José dos Campos: Sol forte na janela esquerda, 34° de elevação"*).
5. **Alertas de Viagem ("Hora de Fechar a Cortina / Passar Protetor")**:
   - Geração de lembretes locais (`expo-notifications`) para avisar o passageiro minutos antes de o sol virar para o lado dele após uma mudança de direção da estrada.
6. **Bilhete de Sombra Compartilhável ("Share Card")**:
   - Resumo visual elegante pronto para compartilhar no WhatsApp/iMessage com quem vai viajar junto (*"Compre poltrona do lado DIREITO (ímpares/finais específicos) no ônibus SP -> RJ das 09:00!"*).
7. **Histórico, Rotas Favoritas e Presets Instantâneos**:
   - Presets de rotas famosas (ex.: *São Paulo → Rio de Janeiro*, *Curitiba → Florianópolis*, *Ponte Aérea CGH → SDU*, *Balsa Ilhabela*, *Lisboa → Porto*) para teste em 1 toque.

---

## 4. Arquitetura de Pastas do Projeto
```text
Fuja_do_sol/
├── app/                          # Expo Router (Navegação nativa iOS Tabs + Modals)
│   ├── _layout.tsx               # Root Layout com ThemeProvider & StatusBar
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Tab Bar iOS (Simulador, Mapa de Assentos, Otimizador, Salvos)
│   │   ├── index.tsx             # Tela Principal: Input da Viagem + Presets + Veredito Rápido
│   │   ├── results.tsx           # Dashboard Completo: Bússola Solar, Scrubber, Linha do Tempo
│   │   ├── seats.tsx             # Mapa de Assentos Interativo (Ônibus, Avião, Carro, Trem, Barco)
│   │   ├── optimizer.tsx         # Simulador "Melhor Horário" (24h) + Modo Golden Hour
│   │   └── saved.tsx             # Viagens Salvas, Histórico & Guia de Proteção UV
├── src/
│   ├── engine/                   # Núcleo Matemático Puro (100% testado via Jest)
│   │   ├── types.ts              # Contratos e interfaces de domínio
│   │   ├── solarPosition.ts      # Algoritmo NOAA / Jean Meeus (Azimute, Elevação, Golden Hour)
│   │   ├── geodesic.ts           # Haversine, Forward Bearing, Interpolação Esférica (SLERP)
│   │   ├── routeDiscretizer.ts   # Amostragem de Polylines e geração de waypoints
│   │   ├── exposureCalculator.ts # Integração de irradiância lateral, frontal, UV e veredito
│   │   ├── seatRecommender.ts    # Matriz de calor por assento para os 5 meios de transporte
│   │   └── timeOptimizer.ts      # Simulação comparativa de múltiplos horários de partida
│   ├── services/
│   │   ├── geocodingService.ts   # Busca híbrida: Base Offline + Nominatim API com cache
│   │   ├── routingService.ts     # Rota real via OSRM API + Fallback Geodésico/Curvo Offline
│   │   └── storageService.ts     # Persistência de viagens favoritas e histórico (AsyncStorage)
│   ├── data/
│   │   ├── hubs.ts               # +100 Cidades, Rodoviárias e Aeroportos com Coordenadas/Fuso
│   │   └── presetTrips.ts        # Viagens famosas pré-configuradas para demonstração imediata
│   ├── components/
│   │   ├── SolarCompassSVG.tsx   # Visualizador vetorial do veículo + trajetória solar
│   │   ├── SeatMapSVG.tsx        # Renderizador interativo de assentos por tipo de transporte
│   │   ├── TimelineChart.tsx     # Gráfico de barras/área da incidência Esquerda vs Direita
│   │   ├── RoutePreviewSVG.tsx   # Mapa vetorial estilizado da rota colorida por lado do sol
│   │   └── ShareTicketCard.tsx   # Card resumo da recomendação para compartilhamento
│   ├── context/
│   │   └── TripContext.tsx       # Estado global reativo da viagem ativa e preferências
│   └── theme/
│       └── colors.ts             # Tokens visuais iOS 18 (Solar Gold, Shade Indigo, Glass)
├── __tests__/                    # Suíte Completa de Testes Automatizados
│   ├── solarPosition.test.ts     # Validação contra efemérides astronômicas reais
│   ├── geodesic.test.ts          # Validação de azimutes cardeais e distâncias Haversine
│   ├── exposureCalculator.test.ts# Cenários físicos reais (SP->RJ manhã/tarde/noite, Equador, etc.)
│   ├── seatRecommender.test.ts   # Testes de recomendação para Ônibus, Avião, Carro, Trem, Barco
│   └── timeOptimizer.test.ts     # Testes do otimizador de horário e Golden Hour
├── appstore/                     # Artefatos prontos para submissão na Apple App Store
│   ├── APP_STORE_CONNECT_GUIDE.md# Passo a passo completo de publicação (Certificados, EAS, Review)
│   ├── metadata-pt-BR.json       # Título, Subtítulo, Keywords, Descrição comercial e Notas de Review
│   ├── PRIVACY_POLICY.md         # Política de Privacidade padrão Apple (Zero coleta de dados pessoais)
│   └── store-checklist.md        # Checklist contra rejeições comuns (Guideline 4.2, 2.1, 5.1.1)
├── eas.json                      # Configuração oficial do EAS Build e EAS Submit para iOS
├── app.json                      # Configuração Expo (Bundle ID, Permissões iOS, Ícones, Splash)
├── package.json
└── tsconfig.json
```

---

## 5. Estratégia de Testes Completos (`__tests__/`)
O Claude Opus deve criar e executar testes exaustivos cobrindo:
1. **Efemérides Solares (`solarPosition.test.ts`)**:
   - Solstício de Verão e Inverno em São Paulo ($\text{lat} = -23.55^\circ, \text{lon} = -46.63^\circ$).
   - Nascer do sol a Leste ($\gamma_{\text{sun}} \approx 70^\circ\text{–}110^\circ$) e Pôr do sol a Oeste ($\gamma_{\text{sun}} \approx 250^\circ\text{–}290^\circ$).
   - Elevação negativa ($\alpha_{\text{sun}} < 0^\circ$) durante a madrugada.
   - Efeito da altitude de cruzeiro ($11.000\text{ m}$) antecipando o nascer e atrasando o pôr do sol.
2. **Invariantes Físicos de Viagem (`exposureCalculator.test.ts`)**:
   - **Caso 1**: Viagem Norte $\to$ Sul ($\theta_{\text{vec}} = 180^\circ$) às 08:00 da manhã. O Sol está a Leste ($\gamma_{\text{sun}} \approx 90^\circ$). Logo $\Delta\psi = 90^\circ - 180^\circ = -90^\circ$ (Esquerda). **O Sol DEVE incidir na Esquerda e a Sombra DEVE estar na Direita.**
   - **Caso 2**: Mesma viagem Norte $\to$ Sul ($\theta_{\text{vec}} = 180^\circ$) às 16:00 da tarde. O Sol está a Oeste ($\gamma_{\text{sun}} \approx 270^\circ$). Logo $\Delta\psi = 270^\circ - 180^\circ = +90^\circ$ (Direita). **O Sol DEVE incidir na Direita e a Sombra DEVE estar na Esquerda.**
   - **Caso 3**: Viagem 100% noturna (23:00 às 03:00). Incidência solar direta deve ser **0%** em ambos os lados, retornando recomendação de conforto/corredor/janela livre.
   - **Caso 4**: Simetria de rota inversa ($A \to B$ vs $B \to A$ no mesmo horário): os lados de sol e sombra devem se inverter perfeitamente!
3. **Testes do Recomendador de Assentos (`seatRecommender.test.ts`)**:
   - Garantir que no modo **"Fuja do Sol"** o assento recomendado sempre pertence ao lado de menor exposição térmica.
   - Garantir que no modo **"Caçador de Pôr do Sol (Golden Hour)"** o assento recomendado seja janela do lado em que ocorre o pôr/nascer do sol se houver crepúsculo durante a viagem.

---

## 6. Arquitetura para Subir o Pacote na Apple App Store (Mesmo Desenvolvendo no Windows!)
Para publicar um app iOS na App Store a partir de qualquer sistema operacional (Windows ou Mac):
1. **Conta Apple Developer Program**: Necessária inscrição anual (US$ 99/ano) em `developer.apple.com`.
2. **EAS Build (Expo Application Services)**:
   - O arquivo `eas.json` já fica configurado com os perfis `development`, `preview` e `production`.
   - Com o comando `npx eas-cli build --platform ios --profile production`, os servidores macOS na nuvem do Expo compilam o código nativo iOS, geram e gerenciam automaticamente o **Distribution Certificate** e o **Provisioning Profile** junto à sua conta Apple, produzindo o binário `.ipa` assinado.
3. **EAS Submit -> TestFlight -> App Store Connect**:
   - Com `npx eas-cli submit --platform ios`, o `.ipa` é enviado direto para o **App Store Connect / TestFlight**.
   - O diretório `appstore/` gerado pelo Claude Opus conterá todos os textos obrigatórios, palavras-chave de ASO (App Store Optimization), política de privacidade e instruções de revisão para aprovação rápida.
