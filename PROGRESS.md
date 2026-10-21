# PROGRESS — Fuja do Sol!

| Fase | Status | Detalhes |
|---|---|---|
| 1. Bootstrap Expo/TS/Jest | ✅ 100% | Expo SDK 57 (compatível com o Expo Go da App Store) + RN 0.86 + TS 6 strict + Expo Router; `app.json` (com.fujadosol.app, dark/light, Info.plist pt-BR, privacy manifest), `eas.json` (development/preview/production), Jest + ts-jest; ícones/splash gerados por `scripts/generate-assets.js` (rasterizador SDF próprio, ícone 1024 sem alfa). |
| 2. Motor físico (`src/engine/`) | ✅ 100% | `solarPosition` (Meeus/NOAA, refração, Kasten-Young, DNI, UV, nascer/pôr, golden hour, depressão do horizonte em altitude), `geodesic` (Haversine, bearing, SLERP, splines, polyline 5/6, Douglas-Peucker), `routeDiscretizer`, `exposureCalculator` (Δψ, faces E/D/F/T/teto, viradas solares, alertas de cortina, golden hour), `seatRecommender` (5 modais), `timeOptimizer` (12–48 horários), `timezone` (UE/EUA/Chile). |
| 3. Dados offline + serviços | ✅ 100% | `hubs.ts` (160+ locais reais, 27 UFs), `presetTrips.ts` (10 viagens, 5 modais), `geocodingService` (fuzzy offline + Nominatim + cache), `routingService` (OSRM + fallback geodésico/waypoints/curva), `storageService` (favoritos, histórico, preferências). |
| 4. Testes | ✅ 100% | 157 testes passando; cobertura do motor ≈ 99,5% linhas / 94% branches. Invariantes físicos verificados (L/O, N→S manhã/tarde, noite = 0%, inversão A→B/B→A, altitude, golden hour frente/trás). |
| 5. Componentes SVG | ✅ 100% | `SolarCompassSVG`, `SeatMapSVG` (5 modais), `RoutePreviewSVG`, `TimelineChart`, `DepartureTimesChart`, `ShareTicketCard`, `PlaceSearchField`, kit de UI iOS. Paleta das séries validada para daltonismo (claro/escuro). |
| 6. Telas | ✅ 100% | Simular, Raio-X (scrubber), Assentos, Horários (24 h), Salvos & Guia. Verificado no preview web (375 px, modo escuro): rota OSRM real, presets, navegação, histórico persistido. |
| 7. Pacote App Store | ✅ 100% | `appstore/` com guia EAS, metadados pt-BR/en-US (limites testados automaticamente), política de privacidade (LGPD), checklist das Guidelines. |
| 8. Auditoria final | ✅ 100% | `tsc --noEmit` 0 erros · 157/157 testes · `expo-doctor` 21/21 · `expo export --platform ios` gera bundle Hermes (3 MB). |

## Pendências manuais (fora do código)
- Conta Apple Developer + `eas init`/`eas build`/`eas submit` (ver `appstore/APP_STORE_CONNECT_GUIDE.md`).
- Publicar a política de privacidade e o suporte em URLs reais (hoje `https://fujadosol.app/...`).
- Capturas de tela 6,9" e teste em iPhone real (build `preview`).
