/**
 * Catálogo offline de localidades reais: capitais e cidades brasileiras, rodoviárias,
 * aeroportos, portos/terminais de balsa, estações de trem e hubs internacionais.
 */
import { guessTimeZone, type TimeZoneId } from '../engine/timezone';
import type { Coordinates } from '../engine/types';

export type PlaceKind = 'city' | 'bus' | 'airport' | 'port' | 'train' | 'custom';

export interface Place {
  id: string;
  name: string;
  city: string;
  /** UF / estado / província (sigla quando houver). */
  region?: string;
  country: string;
  countryCode: string;
  kind: PlaceKind;
  coords: Coordinates;
  tz: TimeZoneId;
  /** Código IATA (aeroportos) ou sigla curta. */
  code?: string;
  aliases?: string[];
  source?: 'offline' | 'online' | 'gps';
}

const COUNTRIES: Record<string, { name: string; tz?: TimeZoneId }> = {
  BR: { name: 'Brasil' },
  PT: { name: 'Portugal', tz: 'Europe/Lisbon' },
  US: { name: 'Estados Unidos', tz: 'America/New_York' },
  AR: { name: 'Argentina', tz: 'America/Argentina/Buenos_Aires' },
  CL: { name: 'Chile', tz: 'America/Santiago' },
  UY: { name: 'Uruguai', tz: 'America/Montevideo' },
  FR: { name: 'França', tz: 'Europe/Paris' },
  ES: { name: 'Espanha', tz: 'Europe/Madrid' },
  GB: { name: 'Reino Unido', tz: 'Europe/London' },
  IT: { name: 'Itália', tz: 'Europe/Rome' },
  DE: { name: 'Alemanha', tz: 'Europe/Berlin' },
  NL: { name: 'Países Baixos', tz: 'Europe/Amsterdam' },
  JP: { name: 'Japão', tz: 'Asia/Tokyo' },
  AE: { name: 'Emirados Árabes Unidos', tz: 'Asia/Dubai' },
  MX: { name: 'México', tz: 'America/Mexico_City' },
  PE: { name: 'Peru', tz: 'America/Lima' },
  CO: { name: 'Colômbia', tz: 'America/Bogota' },
  ZA: { name: 'África do Sul', tz: 'Africa/Johannesburg' },
};

interface Extra {
  code?: string;
  aliases?: string[];
  tz?: TimeZoneId;
}

function h(
  id: string,
  name: string,
  kind: PlaceKind,
  city: string,
  region: string | undefined,
  countryCode: string,
  lat: number,
  lon: number,
  extra: Extra = {},
): Place {
  const c = COUNTRIES[countryCode];
  const coords = { lat, lon };
  return {
    id,
    name,
    kind,
    city,
    region,
    country: c.name,
    countryCode,
    coords,
    tz: extra.tz ?? c.tz ?? guessTimeZone(coords, countryCode, region),
    code: extra.code,
    aliases: extra.aliases,
    source: 'offline',
  };
}

export const HUBS: Place[] = [
  // ───────── Capitais brasileiras ─────────
  h('sao-paulo', 'São Paulo', 'city', 'São Paulo', 'SP', 'BR', -23.5505, -46.6333, { aliases: ['sampa', 'sp'] }),
  h('rio-de-janeiro', 'Rio de Janeiro', 'city', 'Rio de Janeiro', 'RJ', 'BR', -22.9068, -43.1729, { aliases: ['rio', 'rj'] }),
  h('belo-horizonte', 'Belo Horizonte', 'city', 'Belo Horizonte', 'MG', 'BR', -19.9167, -43.9345, { aliases: ['bh', 'beaga'] }),
  h('vitoria', 'Vitória', 'city', 'Vitória', 'ES', 'BR', -20.3155, -40.3128),
  h('curitiba', 'Curitiba', 'city', 'Curitiba', 'PR', 'BR', -25.4284, -49.2733),
  h('florianopolis', 'Florianópolis', 'city', 'Florianópolis', 'SC', 'BR', -27.5954, -48.548, { aliases: ['floripa'] }),
  h('porto-alegre', 'Porto Alegre', 'city', 'Porto Alegre', 'RS', 'BR', -30.0346, -51.2177, { aliases: ['poa'] }),
  h('brasilia', 'Brasília', 'city', 'Brasília', 'DF', 'BR', -15.7939, -47.8828),
  h('goiania', 'Goiânia', 'city', 'Goiânia', 'GO', 'BR', -16.6869, -49.2648),
  h('cuiaba', 'Cuiabá', 'city', 'Cuiabá', 'MT', 'BR', -15.6014, -56.0979),
  h('campo-grande', 'Campo Grande', 'city', 'Campo Grande', 'MS', 'BR', -20.4697, -54.6201),
  h('salvador', 'Salvador', 'city', 'Salvador', 'BA', 'BR', -12.9777, -38.5016),
  h('aracaju', 'Aracaju', 'city', 'Aracaju', 'SE', 'BR', -10.9472, -37.0731),
  h('maceio', 'Maceió', 'city', 'Maceió', 'AL', 'BR', -9.6498, -35.7089),
  h('recife', 'Recife', 'city', 'Recife', 'PE', 'BR', -8.0476, -34.877),
  h('joao-pessoa', 'João Pessoa', 'city', 'João Pessoa', 'PB', 'BR', -7.1195, -34.845),
  h('natal', 'Natal', 'city', 'Natal', 'RN', 'BR', -5.7945, -35.211),
  h('fortaleza', 'Fortaleza', 'city', 'Fortaleza', 'CE', 'BR', -3.7319, -38.5267),
  h('teresina', 'Teresina', 'city', 'Teresina', 'PI', 'BR', -5.092, -42.8038),
  h('sao-luis', 'São Luís', 'city', 'São Luís', 'MA', 'BR', -2.5307, -44.3068),
  h('belem', 'Belém', 'city', 'Belém', 'PA', 'BR', -1.4558, -48.4902),
  h('macapa', 'Macapá', 'city', 'Macapá', 'AP', 'BR', 0.0349, -51.0694),
  h('manaus', 'Manaus', 'city', 'Manaus', 'AM', 'BR', -3.119, -60.0217),
  h('boa-vista', 'Boa Vista', 'city', 'Boa Vista', 'RR', 'BR', 2.8235, -60.6758),
  h('porto-velho', 'Porto Velho', 'city', 'Porto Velho', 'RO', 'BR', -8.7612, -63.9004),
  h('rio-branco', 'Rio Branco', 'city', 'Rio Branco', 'AC', 'BR', -9.9747, -67.81),
  h('palmas', 'Palmas', 'city', 'Palmas', 'TO', 'BR', -10.2491, -48.3243),

  // ───────── Outras cidades brasileiras ─────────
  h('campinas', 'Campinas', 'city', 'Campinas', 'SP', 'BR', -22.9099, -47.0626),
  h('santos', 'Santos', 'city', 'Santos', 'SP', 'BR', -23.9608, -46.3336),
  h('sao-jose-dos-campos', 'São José dos Campos', 'city', 'São José dos Campos', 'SP', 'BR', -23.1896, -45.8841, { aliases: ['sjc'] }),
  h('ribeirao-preto', 'Ribeirão Preto', 'city', 'Ribeirão Preto', 'SP', 'BR', -21.1775, -47.8103),
  h('sorocaba', 'Sorocaba', 'city', 'Sorocaba', 'SP', 'BR', -23.5015, -47.4526),
  h('sao-sebastiao', 'São Sebastião', 'city', 'São Sebastião', 'SP', 'BR', -23.7951, -45.4143),
  h('ilhabela', 'Ilhabela', 'city', 'Ilhabela', 'SP', 'BR', -23.7785, -45.3581),
  h('ubatuba', 'Ubatuba', 'city', 'Ubatuba', 'SP', 'BR', -23.4336, -45.0838),
  h('campos-do-jordao', 'Campos do Jordão', 'city', 'Campos do Jordão', 'SP', 'BR', -22.7394, -45.5914),
  h('aparecida', 'Aparecida', 'city', 'Aparecida', 'SP', 'BR', -22.8495, -45.2339),
  h('paraty', 'Paraty', 'city', 'Paraty', 'RJ', 'BR', -23.2178, -44.7131, { aliases: ['parati'] }),
  h('angra-dos-reis', 'Angra dos Reis', 'city', 'Angra dos Reis', 'RJ', 'BR', -23.0067, -44.3181),
  h('petropolis', 'Petrópolis', 'city', 'Petrópolis', 'RJ', 'BR', -22.5112, -43.1779),
  h('niteroi', 'Niterói', 'city', 'Niterói', 'RJ', 'BR', -22.8832, -43.1034),
  h('buzios', 'Armação dos Búzios', 'city', 'Búzios', 'RJ', 'BR', -22.7469, -41.8817, { aliases: ['buzios'] }),
  h('cabo-frio', 'Cabo Frio', 'city', 'Cabo Frio', 'RJ', 'BR', -22.8894, -42.0286),
  h('resende', 'Resende', 'city', 'Resende', 'RJ', 'BR', -22.4705, -44.4509),
  h('juiz-de-fora', 'Juiz de Fora', 'city', 'Juiz de Fora', 'MG', 'BR', -21.7642, -43.3496),
  h('ouro-preto', 'Ouro Preto', 'city', 'Ouro Preto', 'MG', 'BR', -20.3856, -43.5035),
  h('uberlandia', 'Uberlândia', 'city', 'Uberlândia', 'MG', 'BR', -18.9186, -48.2772),
  h('joinville', 'Joinville', 'city', 'Joinville', 'SC', 'BR', -26.3044, -48.8456),
  h('balneario-camboriu', 'Balneário Camboriú', 'city', 'Balneário Camboriú', 'SC', 'BR', -26.9906, -48.6352, { aliases: ['bc'] }),
  h('blumenau', 'Blumenau', 'city', 'Blumenau', 'SC', 'BR', -26.9194, -49.0661),
  h('itajai', 'Itajaí', 'city', 'Itajaí', 'SC', 'BR', -26.9078, -48.6619),
  h('morretes', 'Morretes', 'city', 'Morretes', 'PR', 'BR', -25.4769, -48.8344),
  h('paranagua', 'Paranaguá', 'city', 'Paranaguá', 'PR', 'BR', -25.5163, -48.5225),
  h('foz-do-iguacu', 'Foz do Iguaçu', 'city', 'Foz do Iguaçu', 'PR', 'BR', -25.5469, -54.5882, { aliases: ['foz', 'cataratas'] }),
  h('londrina', 'Londrina', 'city', 'Londrina', 'PR', 'BR', -23.3045, -51.1696),
  h('gramado', 'Gramado', 'city', 'Gramado', 'RS', 'BR', -29.3788, -50.874),
  h('caxias-do-sul', 'Caxias do Sul', 'city', 'Caxias do Sul', 'RS', 'BR', -29.1678, -51.1794),
  h('porto-seguro', 'Porto Seguro', 'city', 'Porto Seguro', 'BA', 'BR', -16.4435, -39.0643),
  h('morro-de-sao-paulo', 'Morro de São Paulo', 'city', 'Cairu', 'BA', 'BR', -13.38, -38.9136),
  h('ilheus', 'Ilhéus', 'city', 'Ilhéus', 'BA', 'BR', -14.7936, -39.0463),
  h('feira-de-santana', 'Feira de Santana', 'city', 'Feira de Santana', 'BA', 'BR', -12.2664, -38.9663),
  h('caruaru', 'Caruaru', 'city', 'Caruaru', 'PE', 'BR', -8.276, -35.9819),
  h('porto-de-galinhas', 'Porto de Galinhas', 'city', 'Ipojuca', 'PE', 'BR', -8.5036, -35.0042),
  h('fernando-de-noronha', 'Fernando de Noronha', 'city', 'Fernando de Noronha', 'PE', 'BR', -3.8547, -32.4247, { aliases: ['noronha'] }),
  h('jericoacoara', 'Jericoacoara', 'city', 'Jijoca de Jericoacoara', 'CE', 'BR', -2.7975, -40.5137, { aliases: ['jeri'] }),
  h('bonito', 'Bonito', 'city', 'Bonito', 'MS', 'BR', -21.1261, -56.4836),
  h('santarem', 'Santarém', 'city', 'Santarém', 'PA', 'BR', -2.4385, -54.6996),

  // ───────── Rodoviárias ─────────
  h('rod-tiete', 'Terminal Rodoviário Tietê', 'bus', 'São Paulo', 'SP', 'BR', -23.516, -46.6252, { aliases: ['tiete', 'rodoviaria sao paulo'] }),
  h('rod-barra-funda', 'Terminal Rodoviário Barra Funda', 'bus', 'São Paulo', 'SP', 'BR', -23.5254, -46.6672, { aliases: ['barra funda'] }),
  h('rod-jabaquara', 'Terminal Rodoviário Jabaquara', 'bus', 'São Paulo', 'SP', 'BR', -23.6461, -46.6413, { aliases: ['jabaquara'] }),
  h('rod-novo-rio', 'Rodoviária Novo Rio', 'bus', 'Rio de Janeiro', 'RJ', 'BR', -22.899, -43.2093, { aliases: ['novo rio', 'rodoviaria rio'] }),
  h('rod-bh', 'Rodoviária de Belo Horizonte', 'bus', 'Belo Horizonte', 'MG', 'BR', -19.9147, -43.9405, { aliases: ['rodoviaria bh'] }),
  h('rod-curitiba', 'Rodoferroviária de Curitiba', 'bus', 'Curitiba', 'PR', 'BR', -25.4371, -49.2569, { aliases: ['rodoferroviaria'] }),
  h('rod-florianopolis', 'Terminal Rita Maria', 'bus', 'Florianópolis', 'SC', 'BR', -27.5953, -48.5583, { aliases: ['rita maria', 'rodoviaria floripa'] }),
  h('rod-porto-alegre', 'Rodoviária de Porto Alegre', 'bus', 'Porto Alegre', 'RS', 'BR', -30.0234, -51.2196),
  h('rod-brasilia', 'Rodoviária Interestadual de Brasília', 'bus', 'Brasília', 'DF', 'BR', -15.8731, -47.9547),
  h('rod-salvador', 'Rodoviária de Salvador', 'bus', 'Salvador', 'BA', 'BR', -12.9789, -38.4691),
  h('rod-campinas', 'Rodoviária de Campinas', 'bus', 'Campinas', 'SP', 'BR', -22.9001, -47.0687),
  h('rod-recife', 'Terminal Integrado de Passageiros (TIP)', 'bus', 'Recife', 'PE', 'BR', -8.0667, -34.9727, { aliases: ['tip'] }),
  h('rod-goiania', 'Rodoviária de Goiânia', 'bus', 'Goiânia', 'GO', 'BR', -16.66, -49.2577),
  h('rod-fortaleza', 'Rodoviária Engenheiro João Thomé', 'bus', 'Fortaleza', 'CE', 'BR', -3.7556, -38.5323),

  // ───────── Aeroportos brasileiros ─────────
  h('gru', 'Aeroporto de Guarulhos', 'airport', 'Guarulhos', 'SP', 'BR', -23.4356, -46.4731, { code: 'GRU', aliases: ['cumbica'] }),
  h('cgh', 'Aeroporto de Congonhas', 'airport', 'São Paulo', 'SP', 'BR', -23.6261, -46.6564, { code: 'CGH' }),
  h('vcp', 'Aeroporto de Viracopos', 'airport', 'Campinas', 'SP', 'BR', -23.0074, -47.1345, { code: 'VCP' }),
  h('sdu', 'Aeroporto Santos Dumont', 'airport', 'Rio de Janeiro', 'RJ', 'BR', -22.9105, -43.1631, { code: 'SDU' }),
  h('gig', 'Aeroporto do Galeão', 'airport', 'Rio de Janeiro', 'RJ', 'BR', -22.81, -43.2506, { code: 'GIG', aliases: ['tom jobim', 'galeao'] }),
  h('bsb', 'Aeroporto de Brasília', 'airport', 'Brasília', 'DF', 'BR', -15.8697, -47.9208, { code: 'BSB' }),
  h('cnf', 'Aeroporto de Confins', 'airport', 'Confins', 'MG', 'BR', -19.6244, -43.9719, { code: 'CNF' }),
  h('plu', 'Aeroporto da Pampulha', 'airport', 'Belo Horizonte', 'MG', 'BR', -19.8512, -43.9506, { code: 'PLU' }),
  h('rec', 'Aeroporto do Recife', 'airport', 'Recife', 'PE', 'BR', -8.1265, -34.9236, { code: 'REC', aliases: ['guararapes'] }),
  h('ssa', 'Aeroporto de Salvador', 'airport', 'Salvador', 'BA', 'BR', -12.9086, -38.3225, { code: 'SSA' }),
  h('poa', 'Aeroporto Salgado Filho', 'airport', 'Porto Alegre', 'RS', 'BR', -29.9944, -51.1714, { code: 'POA' }),
  h('fln', 'Aeroporto de Florianópolis', 'airport', 'Florianópolis', 'SC', 'BR', -27.6703, -48.5525, { code: 'FLN', aliases: ['hercilio luz'] }),
  h('cwb', 'Aeroporto Afonso Pena', 'airport', 'São José dos Pinhais', 'PR', 'BR', -25.5285, -49.1758, { code: 'CWB' }),
  h('for', 'Aeroporto de Fortaleza', 'airport', 'Fortaleza', 'CE', 'BR', -3.7763, -38.5326, { code: 'FOR', aliases: ['pinto martins'] }),
  h('mao', 'Aeroporto de Manaus', 'airport', 'Manaus', 'AM', 'BR', -3.0386, -60.0497, { code: 'MAO', aliases: ['eduardo gomes'] }),
  h('bel', 'Aeroporto de Belém', 'airport', 'Belém', 'PA', 'BR', -1.3792, -48.4763, { code: 'BEL' }),
  h('nat', 'Aeroporto de Natal', 'airport', 'São Gonçalo do Amarante', 'RN', 'BR', -5.7681, -35.3761, { code: 'NAT' }),
  h('mcz', 'Aeroporto de Maceió', 'airport', 'Maceió', 'AL', 'BR', -9.5108, -35.7917, { code: 'MCZ', aliases: ['zumbi dos palmares'] }),
  h('vix', 'Aeroporto de Vitória', 'airport', 'Vitória', 'ES', 'BR', -20.2581, -40.2864, { code: 'VIX' }),
  h('gyn', 'Aeroporto de Goiânia', 'airport', 'Goiânia', 'GO', 'BR', -16.632, -49.2207, { code: 'GYN' }),
  h('fen', 'Aeroporto de Fernando de Noronha', 'airport', 'Fernando de Noronha', 'PE', 'BR', -3.8549, -32.4233, { code: 'FEN' }),
  h('igu', 'Aeroporto de Foz do Iguaçu', 'airport', 'Foz do Iguaçu', 'PR', 'BR', -25.5963, -54.4872, { code: 'IGU' }),
  h('nvt', 'Aeroporto de Navegantes', 'airport', 'Navegantes', 'SC', 'BR', -26.88, -48.6514, { code: 'NVT' }),
  h('cgb', 'Aeroporto de Cuiabá', 'airport', 'Várzea Grande', 'MT', 'BR', -15.6529, -56.1167, { code: 'CGB' }),
  h('bps', 'Aeroporto de Porto Seguro', 'airport', 'Porto Seguro', 'BA', 'BR', -16.4386, -39.0809, { code: 'BPS' }),

  // ───────── Portos, balsas e terminais hidroviários ─────────
  h('balsa-sao-sebastiao', 'Balsa São Sebastião', 'port', 'São Sebastião', 'SP', 'BR', -23.8063, -45.4027, { aliases: ['balsa ilhabela'] }),
  h('balsa-ilhabela', 'Balsa Ilhabela (Perequê)', 'port', 'Ilhabela', 'SP', 'BR', -23.8137, -45.3664, { aliases: ['pereque'] }),
  h('barcas-praca-xv', 'Estação das Barcas Praça XV', 'port', 'Rio de Janeiro', 'RJ', 'BR', -22.9028, -43.172, { aliases: ['praca xv', 'barcas rio'] }),
  h('barcas-arariboia', 'Estação das Barcas Araribóia', 'port', 'Niterói', 'RJ', 'BR', -22.8935, -43.124, { aliases: ['arariboia', 'barcas niteroi'] }),
  h('terminal-nautico-salvador', 'Terminal Náutico da Bahia', 'port', 'Salvador', 'BA', 'BR', -12.9714, -38.5149, { aliases: ['catamara salvador'] }),
  h('porto-morro', 'Porto de Morro de São Paulo', 'port', 'Cairu', 'BA', 'BR', -13.378, -38.915),
  h('porto-manaus', 'Porto de Manaus', 'port', 'Manaus', 'AM', 'BR', -3.1386, -60.0251),
  h('terminal-belem', 'Terminal Hidroviário de Belém', 'port', 'Belém', 'PA', 'BR', -1.4524, -48.5033),
  h('ilha-grande-abraao', 'Vila do Abraão (Ilha Grande)', 'port', 'Angra dos Reis', 'RJ', 'BR', -23.1418, -44.1693, { aliases: ['ilha grande'] }),
  h('porto-santos', 'Terminal de Passageiros de Santos', 'port', 'Santos', 'SP', 'BR', -23.9706, -46.3022),

  // ───────── Estações de trem ─────────
  h('estacao-curitiba', 'Estação Ferroviária de Curitiba', 'train', 'Curitiba', 'PR', 'BR', -25.4372, -49.2567, { aliases: ['serra verde express'] }),
  h('estacao-morretes', 'Estação Ferroviária de Morretes', 'train', 'Morretes', 'PR', 'BR', -25.477, -48.8339),
  h('estacao-luz', 'Estação da Luz', 'train', 'São Paulo', 'SP', 'BR', -23.5347, -46.6354, { aliases: ['luz'] }),
  h('estacao-jundiai', 'Estação Jundiaí', 'train', 'Jundiaí', 'SP', 'BR', -23.1866, -46.8837),
  h('central-do-brasil', 'Estação Central do Brasil', 'train', 'Rio de Janeiro', 'RJ', 'BR', -22.9037, -43.1914, { aliases: ['central'] }),

  // ───────── Internacionais ─────────
  h('lisboa', 'Lisboa', 'city', 'Lisboa', undefined, 'PT', 38.7223, -9.1393, { aliases: ['lisbon'] }),
  h('lis', 'Aeroporto Humberto Delgado', 'airport', 'Lisboa', undefined, 'PT', 38.7742, -9.1342, { code: 'LIS' }),
  h('santa-apolonia', 'Lisboa Santa Apolónia', 'train', 'Lisboa', undefined, 'PT', 38.714, -9.1225, { aliases: ['santa apolonia'] }),
  h('porto', 'Porto', 'city', 'Porto', undefined, 'PT', 41.1579, -8.6291, { aliases: ['oporto'] }),
  h('opo', 'Aeroporto Francisco Sá Carneiro', 'airport', 'Porto', undefined, 'PT', 41.2481, -8.6814, { code: 'OPO' }),
  h('campanha', 'Porto Campanhã', 'train', 'Porto', undefined, 'PT', 41.1489, -8.5856, { aliases: ['campanha'] }),
  h('miami', 'Miami', 'city', 'Miami', 'FL', 'US', 25.7617, -80.1918),
  h('mia', 'Aeroporto Internacional de Miami', 'airport', 'Miami', 'FL', 'US', 25.7959, -80.287, { code: 'MIA' }),
  h('orlando', 'Orlando', 'city', 'Orlando', 'FL', 'US', 28.5383, -81.3792, { aliases: ['disney'] }),
  h('mco', 'Aeroporto Internacional de Orlando', 'airport', 'Orlando', 'FL', 'US', 28.4312, -81.3081, { code: 'MCO' }),
  h('nova-york', 'Nova York', 'city', 'Nova York', 'NY', 'US', 40.7128, -74.006, { aliases: ['new york', 'nyc'] }),
  h('jfk', 'Aeroporto JFK', 'airport', 'Nova York', 'NY', 'US', 40.6413, -73.7781, { code: 'JFK' }),
  h('lax', 'Aeroporto de Los Angeles', 'airport', 'Los Angeles', 'CA', 'US', 33.9416, -118.4085, { code: 'LAX', tz: 'America/Los_Angeles' }),
  h('buenos-aires', 'Buenos Aires', 'city', 'Buenos Aires', undefined, 'AR', -34.6037, -58.3816),
  h('eze', 'Aeroporto de Ezeiza', 'airport', 'Buenos Aires', undefined, 'AR', -34.8222, -58.5358, { code: 'EZE' }),
  h('aep', 'Aeroparque Jorge Newbery', 'airport', 'Buenos Aires', undefined, 'AR', -34.5592, -58.4156, { code: 'AEP' }),
  h('santiago', 'Santiago', 'city', 'Santiago', undefined, 'CL', -33.4489, -70.6693, { aliases: ['santiago do chile'] }),
  h('scl', 'Aeroporto de Santiago', 'airport', 'Santiago', undefined, 'CL', -33.393, -70.7858, { code: 'SCL' }),
  h('montevideu', 'Montevidéu', 'city', 'Montevidéu', undefined, 'UY', -34.9011, -56.1645, { aliases: ['montevideo'] }),
  h('mvd', 'Aeroporto de Carrasco', 'airport', 'Montevidéu', undefined, 'UY', -34.8384, -56.0308, { code: 'MVD' }),
  h('paris', 'Paris', 'city', 'Paris', undefined, 'FR', 48.8566, 2.3522),
  h('cdg', 'Aeroporto Charles de Gaulle', 'airport', 'Paris', undefined, 'FR', 49.0097, 2.5479, { code: 'CDG' }),
  h('gare-de-lyon', 'Paris Gare de Lyon', 'train', 'Paris', undefined, 'FR', 48.8443, 2.3744),
  h('madrid', 'Madri', 'city', 'Madri', undefined, 'ES', 40.4168, -3.7038, { aliases: ['madrid'] }),
  h('mad', 'Aeroporto de Madri-Barajas', 'airport', 'Madri', undefined, 'ES', 40.4983, -3.5676, { code: 'MAD' }),
  h('londres', 'Londres', 'city', 'Londres', undefined, 'GB', 51.5074, -0.1278, { aliases: ['london'] }),
  h('lhr', 'Aeroporto de Heathrow', 'airport', 'Londres', undefined, 'GB', 51.47, -0.4543, { code: 'LHR' }),
  h('roma', 'Roma', 'city', 'Roma', undefined, 'IT', 41.9028, 12.4964, { aliases: ['rome'] }),
  h('fco', 'Aeroporto de Fiumicino', 'airport', 'Roma', undefined, 'IT', 41.8003, 12.2389, { code: 'FCO' }),
  h('fra', 'Aeroporto de Frankfurt', 'airport', 'Frankfurt', undefined, 'DE', 50.0379, 8.5622, { code: 'FRA' }),
  h('ams', 'Aeroporto de Schiphol', 'airport', 'Amsterdã', undefined, 'NL', 52.3105, 4.7683, { code: 'AMS' }),
  h('toquio', 'Tóquio', 'city', 'Tóquio', undefined, 'JP', 35.6762, 139.6503, { aliases: ['tokyo'] }),
  h('hnd', 'Aeroporto de Haneda', 'airport', 'Tóquio', undefined, 'JP', 35.5494, 139.7798, { code: 'HND' }),
  h('nrt', 'Aeroporto de Narita', 'airport', 'Narita', undefined, 'JP', 35.772, 140.3929, { code: 'NRT' }),
  h('dxb', 'Aeroporto de Dubai', 'airport', 'Dubai', undefined, 'AE', 25.2532, 55.3657, { code: 'DXB' }),
  h('mex', 'Aeroporto da Cidade do México', 'airport', 'Cidade do México', undefined, 'MX', 19.4361, -99.0719, { code: 'MEX' }),
  h('cun', 'Aeroporto de Cancún', 'airport', 'Cancún', undefined, 'MX', 21.0365, -86.8771, { code: 'CUN', tz: 'America/Cancun' }),
  h('lim', 'Aeroporto Jorge Chávez', 'airport', 'Lima', undefined, 'PE', -12.0219, -77.1143, { code: 'LIM' }),
  h('bog', 'Aeroporto El Dorado', 'airport', 'Bogotá', undefined, 'CO', 4.7016, -74.1469, { code: 'BOG' }),
  h('jnb', 'Aeroporto de Joanesburgo', 'airport', 'Joanesburgo', undefined, 'ZA', -26.1367, 28.2411, { code: 'JNB' }),
];

const BY_ID = new Map(HUBS.map((p) => [p.id, p]));

export function getHub(id: string): Place | undefined {
  return BY_ID.get(id);
}

export function requireHub(id: string): Place {
  const p = BY_ID.get(id);
  if (!p) throw new Error(`Hub desconhecido: ${id}`);
  return p;
}

export const KIND_LABELS: Record<PlaceKind, string> = {
  city: 'Cidade',
  bus: 'Rodoviária',
  airport: 'Aeroporto',
  port: 'Porto / Balsa',
  train: 'Estação de trem',
  custom: 'Local',
};

/** Rótulo curto para cards e bilhetes (código IATA ou 3 letras). */
export function shortCode(p: Place): string {
  if (p.code) return p.code;
  const words = p.city
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z ]/g, '')
    .split(' ')
    .filter((w) => w.length > 2 && !['dos', 'das', 'del', 'los'].includes(w.toLowerCase()));
  // 3+ palavras significativas → iniciais (SJC); caso contrário, 3 primeiras letras (SAO, RIO).
  const s = words.length >= 3 ? words.map((w) => w[0]).join('').slice(0, 3) : (words[0] ?? p.name).slice(0, 3);
  return s.toUpperCase().padEnd(3, 'X');
}
