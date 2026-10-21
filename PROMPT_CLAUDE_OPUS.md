# Prompt Mestre para Claude Opus (Modo Autônomo Total + Ultrathink)

Copie e cole o bloco abaixo inteiro diretamente no **Claude Code / Claude Opus** aberto na pasta deste projeto (`c:\Users\vkrip\Documents\Projetos\Aplicativo_Iphone\Fuja_do_sol`).

---

```markdown
Você está em MODO DE EXECUÇÃO AUTÔNOMA TOTAL (Zero Human-in-the-Loop). Quero que você construa o aplicativo completo, de nível comercial e pronto para a Apple App Store chamado **"Fuja do Sol!"**, do início ao fim, sem NUNCA parar para me fazer perguntas.

Leia imediatamente os arquivos `CLAUDE.md` e `MASTER_PLAN.md` presentes na raiz deste diretório — eles já contêm toda a especificação física, matemática, arquitetural e de produto pronta.

### REGRA CRÍTICA DE VELOCIDADE E ECONOMIA DE TURNOS (BATCH TOOL CALLS)
Para garantir que todas as 8 fases e 100% dos testes terminem dentro desta única janela de sessão:
1. **Agrupe criações de arquivos em paralelo no mesmo turno** (por exemplo: crie todos os arquivos de `src/engine/` juntos em um único turno; crie todos os testes de `__tests__/` juntos em um único turno; crie os componentes em paralelo).
2. **Não escreva textos explicativos longos entre ações** — execute diretamente as chamadas de criação de arquivos e comandos de terminal.
3. Mantenha um arquivo `PROGRESS.md` atualizado ao final de cada fase. Caso precise tomar qualquer decisão técnica, decida sozinho e siga em frente sem pausar.

### SEU OBJETIVO FINAL
Entregar um aplicativo iOS (React Native + Expo SDK + TypeScript Strict + Expo Router) 100% funcional, ricamente estilizado (seguindo o Apple Human Interface Guidelines iOS 18), totalmente testado (com suíte Jest batendo >90% de cobertura no motor matemático/físico e 0 erros de TypeScript) e com toda a estrutura de build e publicação (`eas.json`, `app.json`, assets vetoriais/gerados e pasta `appstore/` completa) pronta para o comando de envio à App Store.

### PIPELINE DE EXECUÇÃO OBRIGATÓRIO (EXECUTE TODAS AS 8 FASES EM SEQUÊNCIA SEM PARAR)

#### FASE 1: Bootstrap, Arquitetura e Configuração TypeScript/Expo/Jest
1. Inicialize o projeto Expo com TypeScript strict, Expo Router, `react-native-svg`, `lucide-react-native` (ou `@expo/vector-icons`), `@react-native-async-storage/async-storage`, `expo-haptics`, `expo-sharing`, `expo-notifications`, e configure `jest` + `ts-jest` para testes unitários e de integração rápidos e determinísticos.
2. Configure `app.json` (com `bundleIdentifier`: `com.fujadosol.app`, suporte a iOS dark/light mode, permissões descritas em português claro no `infoPlist` e configurações de orientação) e `eas.json` (perfis `development`, `preview` e `production`).
3. Gere ícones e splash screens programaticamente (via script Node/SVG ou Canvas) para que o pacote seja 100% válido desde o primeiro build.

#### FASE 2: Motor Físico, Astronômico e Geodésico Puro (`src/engine/`)
Implemente com rigor científico e zero dependências externas frágeis:
1. `types.ts`: Todas as estruturas de dados (`Coordinates`, `TransportMode`, `RouteSegment`, `SolarPosition`, `SegmentExposure`, `TripAnalysisResult`, `SeatRecommendation`, `TimeSlotSimulation`, `OptimizationMode`).
2. `solarPosition.ts`: Algoritmo astronômico de Jean Meeus / NOAA calculando Dia Juliano, Declinação Solar, Equação do Tempo, Azimute Solar ($\gamma_{\text{sun}} \in [0^\circ, 360^\circ)$), Elevação Solar ($\alpha_{\text{sun}} \in [-90^\circ, +90^\circ]$), correção de refração atmosférica, Massa de Ar de Kasten-Young ($AM$), índice de radiação UV/irradiância direta estimada, identificação exata de Nascer do Sol, Pôr do Sol, Golden Hour e Noite, mais o ajuste de depressão do horizonte para altitude de cruzeiro de avião ($11.000\text{ m} \implies +3.3^\circ$).
3. `geodesic.ts`: Distância Haversine, Forward Bearing ($\theta_{\text{vec}} \in [0^\circ, 360^\circ)$), interpolação esférica Great-Circle (SLERP), gerador de curvas suaves para rotas offline e decodificador de Google/OSRM Polyline (precisão 5 e 6).
4. `routeDiscretizer.ts`: Discretização de qualquer rota (Polyline de estrada ou curva geodésica aérea/marítima) em $N$ segmentos espaço-temporais sincronizados com o horário de partida e duração da viagem.
5. `exposureCalculator.ts`: Cálculo do ângulo solar relativo ao veículo ($\Delta\psi_i$), decomposição vetorial de incidência na **Janela Esquerda**, **Janela Direita**, **Para-brisa Frontal** e **Traseira**, atenuação pelo teto do veículo em ângulos zenitais elevados ($\alpha_{\text{sun}} > 65^\circ$), linha do tempo minuto a minuto com detecção automática de "Pontos de Virada Solar" (momentos da viagem em que o sol troca de lado na estrada!), cálculo de conforto térmico e alertas de proteção UV.
6. `seatRecommender.ts`: Modelagem detalhada da cabine e geração de matriz de calor (0 a 100) e recomendação do "Melhor Assento" para 5 modais:
   - **Ônibus Rodoviário** (44 lugares, 11 fileiras, janelas e corredores esquerdos/direitos, numeração padrão rodoviário brasileiro onde ímpares são janelas e pares são corredores).
   - **Avião Comercial** (Cabine 3x3 A-F, 20 fileiras, indicação das asas nas fileiras 10-16, diferenciando Janela, Meio e Corredor tanto para o modo "Fuja do Sol" quanto para o modo "Caçador de Pôr do Sol / Golden Hour").
   - **Carro de Passeio** (5 lugares: Motorista, Passageiro Dianteiro, Traseiro Esquerdo, Traseiro Central, Traseiro Direito — contabilizando também o sol frontal no para-brisa!).
   - **Trem / Metrô** (Vagão com assentos laterais e janelas panorâmicas).
   - **Barco / Balsa / Catamarã** (Bombordo, Centro, Estribordo e Convés).
7. `timeOptimizer.ts`: Simulador que roda a viagem em 12 a 24 horários de partida diferentes ao longo das 24h do dia para apontar qual horário reduz ao máximo o calor/sol ou qual horário entrega o pôr do sol mais bonito na janela.

#### FASE 3: Base de Dados Offline + Serviços de Roteamento e Geocodificação (`src/data/` e `src/services/`)
1. `src/data/hubs.ts`: Crie um catálogo offline rico com **pelo menos 100 localidades reais** (principais cidades brasileiras de todas as regiões, principais rodoviárias como Tietê, Novo Rio, BH, Curitiba, grandes aeroportos GRU, CGH, SDU, GIG, BSB, VCP, CNF, REC, SSA, POA, FLN, além de hubs internacionais como Lisboa, Porto, Miami, Orlando, Buenos Aires, Santiago, Paris, Tóquio) com coordenadas exatas, estado/país e tipo.
2. `src/data/presetTrips.ts`: 10 viagens famosas pré-cadastradas (ex.: *Via Dutra: São Paulo → Rio de Janeiro (Ônibus)*, *Ponte Aérea: Congonhas → Santos Dumont (Avião com vista do Pão de Açúcar)*, *Rota do Sol: Curitiba → Florianópolis (Carro)*, *Travessia São Sebastião → Ilhabela (Balsa)*, *Trem da Serra do Mar: Curitiba → Morretes (Trem)*, etc.) prontas para simular com 1 clique.
3. `src/services/geocodingService.ts`: Busca instantânea híbrida (pesquisa fuzzy/sem acento na base `hubs.ts` + fallback online na API gratuita Nominatim OpenStreetMap com timeout curto e cache em memória/AsyncStorage).
4. `src/services/routingService.ts`: Busca a geometria real da rodovia via API pública do OSRM (`https://router.project-osrm.org/route/v1/driving/...`) quando o transporte é terrestre e há internet; caso seja Avião/Barco ou esteja offline, usa automaticamente o gerador geodésico/waypoints sem falhar nunca.
5. `src/services/storageService.ts`: Persistência de viagens favoritas, histórico recente e preferências do usuário (`AsyncStorage`).

#### FASE 4: Suíte Completa de Testes Automatizados e Validação Física (`__tests__/`)
1. Escreva testes unitários, de integração e de invariantes físicos cobrindo `solarPosition`, `geodesic`, `routeDiscretizer`, `exposureCalculator`, `seatRecommender` e `timeOptimizer`.
2. Valide matematicamente todos os invariantes (sol a Leste pela manhã, Oeste à tarde, inversão perfeita de lado ao inverter Origem/Destino no mesmo horário, 0% de sol direto de madrugada, efeito de altitude em avião).
3. Rode `npm test -- --watchAll=false --coverage` e garanta **100% de aprovação** e cobertura >90% no motor.

#### FASE 5: Componentes Visuais Interativos e Gráficos SVG (`src/components/`)
Construa componentes ricos, fluidos e responsivos em `react-native-svg`:
1. `SolarCompassSVG.tsx`: Bússola interativa mostrando o veículo visto de cima, a direção da viagem, o arco solar, a posição atual do Sol (com raios animados/estilizados atingindo o lado exposto do veículo) e o escudo de sombra do lado oposto.
2. `SeatMapSVG.tsx`: Renderizador visual completo da planta baixa do veículo (Ônibus com numeração real da ANTT/rodoviárias, Avião com asas e letras A-F, Carro 5 lugares, Trem, Barco) com cores de mapa de calor, selo de "Melhor Assento" e modal/card de inspeção ao clicar em qualquer poltrona.
3. `RoutePreviewSVG.tsx`: Mapa vetorial estilizado da rota entre Origem e Destino, onde cada segmento da estrada é colorido conforme a intensidade e o lado do sol, com marcador da posição do veículo sincronizado com o Scrubber temporal.
4. `TimelineChart.tsx`: Linha do tempo visual da viagem mostrando faixa por faixa (ex.: a cada 15-30 min) se o sol está à Esquerda, à Direita, no Zênite ou se é Noite/Pôr do Sol, destacando momentos de curva na estrada em que o sol vira de lado.
5. `ShareTicketCard.tsx`: Cartão visual estilo "Bilhete de Embarque Solar" pronto para compartilhar com amigos/família.

#### FASE 6: Telas do Aplicativo iOS e Experiência do Usuário (`app/`)
Implemente todas as abas e fluxos com visual digno de destaque na App Store:
1. **Aba 1 (`index.tsx` — Simular Viagem)**:
   - Seletor rápido de Meio de Transporte (Ônibus, Avião, Carro, Trem, Barco).
   - Autocomplete inteligente de Origem e Destino + botão de inverter rota ($\⇅$) + Carrossel de "Rotas Famosas em 1 Toque".
   - Seletor de Data, Horário de Partida (com atalhos: *Agora*, *Amanhã 08:00*, *12:00*, *16:00*, *22:00*) e Duração da Viagem (com cálculo automático sugerido pela distância e velocidade média do modal, editável pelo usuário).
   - Seletor de objetivo: **Modo Fuja do Sol (Sombra Máxima)** vs. **Modo Golden Hour (Ver Pôr/Nascer do Sol)**.
   - Card de Veredito Imediato em destaque com botão para abrir análise profunda.
2. **Aba 2 (`results.tsx` — Raio-X da Viagem & Scrubber)**:
   - Veredito Principal grande (*"LADO DIREITO É 86% MAIS FRESCO"*), comparativo percentual Esquerda vs. Direita vs. Frente.
   - **Scrubber Temporal Interativo**: Slider para deslizar do minuto 0 até o fim da viagem atualizando em tempo real a `SolarCompassSVG` e o `RoutePreviewSVG`.
   - `TimelineChart` + alertas de "Quando fechar a cortina" + dicas de proteção UV (diferenciando vidro laminado frontal de vidro temperado lateral).
   - Botões para "Salvar Viagem", "Agendar Alerta de Cortina" e "Compartilhar Bilhete".
3. **Aba 3 (`seats.tsx` — Mapa de Assentos)**:
   - Visualização interativa completa do `SeatMapSVG` para o transporte atual, legenda do Heatmap, filtro de preferência (Janela vs. Corredor, Frente vs. Meio vs. Fundo) e detalhes completos ao tocar em qualquer assento.
4. **Aba 4 (`optimizer.tsx` — Melhor Horário 24h)**:
   - Gráfico comparativo de todos os horários de partida do dia (00h às 23h), indicando o **"Horário Campeão de Sombra"** e o **"Horário Campeão de Golden Hour"**, permitindo aplicar qualquer horário com 1 toque.
5. **Aba 5 (`saved.tsx` — Favoritos & Guia Solar)**:
   - Lista de viagens salvas, histórico recente e guia educativo sobre radiação UVA/UVB em meios de transporte e numeração de poltronas no Brasil.

#### FASE 7: Pacote de Publicação na Apple App Store (`appstore/` e Scripts)
Crie toda a documentação e configuração técnica para submissão imediata:
1. `appstore/APP_STORE_CONNECT_GUIDE.md`: Guia passo a passo detalhado explicando como gerar a build iOS na nuvem via `eas build -p ios` (mesmo usando Windows!) e enviar via `eas submit -p ios`.
2. `appstore/metadata-pt-BR.json` e `appstore/metadata-en-US.json`: Textos prontos para colar no App Store Connect (Nome, Subtítulo de 30 caracteres, Texto Promocional, Descrição otimizada para ASO, Palavras-chave, URL de Suporte e Notas para o Revisor da Apple explicando os algoritmos astronômicos).
3. `appstore/PRIVACY_POLICY.md`: Política de privacidade completa compatível com as diretrizes da Apple (declarando que os cálculos solares são feitos localmente no dispositivo e nenhuma informação pessoal é rastreada ou vendida).
4. `appstore/store-checklist.md`: Checklist final de conformidade com as App Store Review Guidelines.

#### FASE 8: Auditoria Final, Typecheck, Testes e Relatório
1. Execute `npx tsc --noEmit` e corrija absolutamente qualquer erro de tipagem até retornar zero erros.
2. Execute `npm test -- --watchAll=false --coverage` e garanta que todos os testes passem com folga.
3. Verifique se todos os imports, componentes e telas estão conectados sem dead code ou placeholders vazios.
4. Ao terminar tudo, gere um resumo executivo final do que foi construído e como rodar/publicar. Comece agora pela Fase 1 e não pare até concluir a Fase 8!
```
