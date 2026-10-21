# Checklist de conformidade — App Store Review Guidelines

Marque cada item antes de enviar para revisão. ✅ = já atendido no código/configuração; ☐ = ação manual sua.

## Técnico (build)
- ✅ `npm run typecheck` sem erros e `npm test -- --watchAll=false --coverage` 100% verde.
- ✅ Bundle ID `com.fujadosol.app`, versão `1.0.0`, `buildNumber` auto-incrementado (`eas.json` → `production.autoIncrement`).
- ✅ Ícone 1024×1024 **sem canal alfa** (`assets/icon.png`), splash claro/escuro.
- ✅ `ITSAppUsesNonExemptEncryption = false` (só HTTPS padrão do iOS).
- ✅ Privacy Manifest (`ios.privacyManifests`): sem rastreamento, sem dados coletados; motivos de API declarados (UserDefaults `CA92.1`, FileTimestamp `C617.1`).
- ✅ iPhone apenas (`supportsTablet: false`) — dispensa screenshots de iPad.
- ✅ Orientação retrato; Dark Mode automático (`userInterfaceStyle: automatic`).
- ☐ Build `preview` instalado e testado em um iPhone real (abrir todas as abas, compartilhar bilhete, agendar alerta, usar localização).

## 1. Segurança
- ✅ **1.1 / 1.4** Sem conteúdo ofensivo; o app reforça que os cálculos são estimativas (rodapé da política e Guia Solar) e não substitui proteção solar.

## 2. Desempenho
- ✅ **2.1 Completude:** sem placeholders, telas vazias ou links quebrados; todos os botões funcionam offline.
- ☐ **2.1** URLs de suporte e privacidade **publicadas e acessíveis** (publicar `PRIVACY_POLICY.md`; atualizar `supportUrl`/`privacyPolicyUrl` nos JSONs se usar outro domínio).
- ✅ **2.3 Metadados precisos:** descrição e capturas mostram apenas recursos existentes; nome ≤ 30, subtítulo ≤ 30, palavras-chave ≤ 100 caracteres.
- ☐ **2.3.3** Capturas reais do app em iPhone 6,9".
- ✅ **2.5.1** Apenas APIs públicas (Expo SDK).
- ✅ **2.5.4** Sem modos de background.

## 3. Negócios
- ✅ **3.1** Sem compras, assinaturas ou conteúdo desbloqueável.

## 4. Design
- ✅ **4.0** Segue o HIG: título grande, Tab Bar com 5 abas, áreas de toque ≥ 44 pt, SF Symbols-like (Ionicons), Dynamic Dark Mode, feedback háptico.
- ✅ **4.2 Funcionalidade mínima:** motor astronômico próprio, rota real, mapas de assentos de 5 modais, otimizador de 24 h, alertas locais, compartilhamento, modo offline — muito além de um "site empacotado".
- ✅ **4.2.3** Funciona sem outros apps e sem internet.

## 5. Legal / Privacidade
- ✅ **5.1.1 (i)** Política de privacidade completa (`PRIVACY_POLICY.md`).
- ✅ **5.1.1 (ii)** Permissões com finalidade clara em português (`NSLocationWhenInUseUsageDescription`), solicitadas **somente** quando o usuário toca no recurso; o app funciona sem elas.
- ✅ **5.1.1 (v)** Sem login → não é necessário "apagar conta".
- ✅ **5.1.2** Nenhum dado compartilhado com terceiros para publicidade/analytics.
- ☐ Rótulo de privacidade no App Store Connect: **"Data Not Collected"**.
- ✅ **5.2** Atribuição de dados de mapas: "© colaboradores do OpenStreetMap" na tela Salvos → Sobre.
- ✅ Uso dos servidores públicos OSRM/Nominatim dentro das políticas de uso (User-Agent identificado, debounce de 650 ms, cache local e opção de desligar).

## Envio
- ☐ Classificação etária 4+ respondida.
- ☐ Notas para o revisor coladas (`reviewNotes`).
- ☐ Contato de revisão (nome, e-mail, telefone) preenchido.
- ☐ Build selecionado na versão 1.0.0 → **Adicionar para revisão**.
