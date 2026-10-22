# Política de Privacidade — Fuja do Sol!

**Última atualização:** 21 de outubro de 2026

O **Fuja do Sol!** ("app") foi criado para ajudar você a escolher o melhor lado do veículo em uma viagem. Ele foi projetado para funcionar **sem coletar dados pessoais**. Esta política explica, de forma simples, o que acontece com as informações que você usa no app, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018) e com as diretrizes da Apple.

## 1. Resumo

- **Não** exigimos cadastro, login ou e-mail.
- **Não** coletamos, vendemos, alugamos ou compartilhamos dados pessoais.
- **Não** usamos publicidade, analytics, SDKs de rastreamento ou identificadores de publicidade (IDFA).
- **Todos os cálculos solares** (posição do Sol, exposição por janela, recomendação de assentos e melhor horário) acontecem **localmente no seu aparelho**.

## 2. Dados armazenados somente no seu aparelho

| Dado | Finalidade | Onde fica |
|---|---|---|
| Viagens favoritas e histórico recente | Reabrir viagens com um toque | Armazenamento local do app (AsyncStorage) |
| Preferências (lado/fileira, antecedência de alertas, uso de serviços online) | Personalizar o app | Armazenamento local do app |
| Cache de buscas de lugares | Acelerar buscas e reduzir uso de rede | Armazenamento local do app |

Esses dados **nunca** são enviados para servidores nossos — não operamos servidores para o app. Você pode apagá-los em **Salvos → Limpar** ou desinstalando o app.

## 3. Localização (opcional)

Se você tocar em **"Usar minha localização"**, o app pede permissão de localização **apenas durante o uso** para preencher a origem da viagem. A coordenada é usada no próprio aparelho para identificar a cidade mais próxima na base offline e **não é armazenada nem enviada a terceiros** por esse recurso. O app funciona normalmente sem essa permissão.

## 4. Notificações locais (opcional)

Os alertas **"Hora de fechar a cortina"** são notificações **locais**, agendadas no próprio iPhone. Não usamos notificações push nem enviamos dados para servidores de notificação.

## 5. Serviços de mapas de terceiros (opcional)

Para obter o traçado real das estradas e buscar endereços fora da base offline, o app pode consultar serviços públicos do projeto **OpenStreetMap**:

- **OSRM** (`router.project-osrm.org`) — recebe as coordenadas de origem, destino e pontos intermediários da rota consultada;
- **Nominatim** (`nominatim.openstreetmap.org`) — recebe o texto digitado na busca de lugares.
- **Esri ArcGIS Online** (`server.arcgisonline.com`) — quando você escolhe os modos **Mapa** ou **Satélite** no Raio-X, recebe os índices das "peças" (tiles) do mapa da região da rota.

Essas requisições são feitas apenas para responder à sua solicitação em tempo real, não contêm identificadores pessoais nem dados de conta e não são vinculadas a você pelo app. Como em qualquer acesso à internet, esses serviços podem registrar o endereço IP de forma técnica, conforme as políticas da OpenStreetMap Foundation (<https://osmfoundation.org/wiki/Privacy_Policy>). Você pode **desligar totalmente** essas consultas em **Salvos → Ajustes → Rotas e buscas online**; nesse caso o app funciona 100% offline.

## 6. Compartilhamento

O **Bilhete de Sombra** só é compartilhado quando você toca em "Compartilhar", usando a planilha de compartilhamento do iOS. Você escolhe o destino (WhatsApp, Mensagens etc.); o app não recebe nenhuma informação sobre esse envio.

## 7. Crianças

O app é classificado como 4+ e não coleta dados de nenhum usuário, inclusive de crianças.

## 8. Seus direitos (LGPD)

Como não coletamos nem tratamos dados pessoais em servidores, não mantemos registros sobre você. Todos os dados locais estão sob seu controle e podem ser apagados a qualquer momento no próprio app ou removendo-o do aparelho. Dúvidas podem ser enviadas pelo canal de suporte abaixo.

## 9. Alterações nesta política

Se esta política mudar, a nova versão será publicada nesta mesma página com a data de atualização. Mudanças relevantes também serão descritas nas notas da versão na App Store.

## 10. Contato

Suporte: <https://fujadosol.app/suporte>

---

*Os cálculos do app são estimativas baseadas em céu claro e geometria simplificada do veículo. Nuvens, prédios, montanhas, árvores, películas e cortinas alteram a exposição real.*
