/** Campo de origem/destino com autocomplete híbrido (offline instantâneo + Nominatim com debounce). */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { KIND_LABELS, type Place, type PlaceKind } from '../data/hubs';
import { getCurrentCoordinates, haptics } from '../services/deviceServices';
import { placeFromCoordinates, searchOffline, searchPlaces } from '../services/geocodingService';
import { useAppTheme } from '../theme/colors';
import type { IconName } from '../utils/format';

const KIND_ICON: Record<PlaceKind, IconName> = {
  city: 'business',
  bus: 'bus',
  airport: 'airplane',
  port: 'boat',
  train: 'train',
  custom: 'location',
};

export function PlaceSearchField({
  label,
  value,
  onSelect,
  allowCurrentLocation,
  online = true,
}: {
  label: string;
  value: Place;
  onSelect: (p: Place) => void;
  allowCurrentLocation?: boolean;
  online?: boolean;
}) {
  const { colors } = useAppTheme();
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    if (!editing) return;
    const q = query.trim();
    setResults(searchOffline(q, 8));
    if (q.length < 3 || !online) return;
    const id = ++reqId.current;
    const timer = setTimeout(() => {
      setLoading(true);
      void searchPlaces(q, { online: true })
        .then((r) => {
          if (id === reqId.current) setResults(r.results);
        })
        .finally(() => {
          if (id === reqId.current) setLoading(false);
        });
    }, 650);
    return () => clearTimeout(timer);
  }, [query, editing, online]);

  const choose = (p: Place) => {
    haptics.selection();
    onSelect(p);
    setEditing(false);
    setQuery('');
  };

  const useLocation = async () => {
    setLocating(true);
    const c = await getCurrentCoordinates();
    setLocating(false);
    if (c) choose(placeFromCoordinates(c));
  };

  if (!editing) {
    return (
      <Pressable
        onPress={() => setEditing(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value.name}. Toque para alterar.`}
        style={({ pressed }) => [styles.display, { opacity: pressed ? 0.7 : 1 }]}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.chipBackground }]}>
          <Ionicons name={KIND_ICON[value.kind]} size={18} color={colors.tint} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
          <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>
            {value.name}
          </Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]} numberOfLines={1}>
            {[value.city !== value.name ? value.city : null, value.region, value.country].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <Ionicons name="search" size={18} color={colors.textMuted} />
      </Pressable>
    );
  }

  return (
    <View>
      <View style={[styles.inputRow, { backgroundColor: colors.chipBackground }]}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          autoFocus
          value={query}
          onChangeText={setQuery}
          placeholder={`${label}: cidade, rodoviária, aeroporto…`}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text }]}
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel={`Buscar ${label.toLowerCase()}`}
        />
        {loading ? <ActivityIndicator size="small" color={colors.tint} /> : null}
        <Pressable onPress={() => setEditing(false)} accessibilityRole="button" accessibilityLabel="Cancelar busca" hitSlop={10}>
          <Text style={{ color: colors.tintText, fontWeight: '600', marginLeft: 8 }}>Cancelar</Text>
        </Pressable>
      </View>
      {allowCurrentLocation ? (
        <Pressable onPress={useLocation} style={styles.result} accessibilityRole="button" accessibilityLabel="Usar minha localização">
          <Ionicons name="navigate" size={18} color={colors.tint} style={{ width: 26 }} />
          <Text style={[styles.resultName, { color: colors.tintText }]}>{locating ? 'Localizando…' : 'Usar minha localização'}</Text>
        </Pressable>
      ) : null}
      {results.map((p) => (
        <Pressable
          key={p.id}
          onPress={() => choose(p)}
          style={({ pressed }) => [styles.result, { borderBottomColor: colors.separator, opacity: pressed ? 0.6 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={`${p.name}, ${KIND_LABELS[p.kind]}`}
        >
          <Ionicons name={KIND_ICON[p.kind]} size={18} color={colors.textSecondary} style={{ width: 26 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.resultName, { color: colors.text }]} numberOfLines={1}>
              {p.name}
              {p.code ? <Text style={{ color: colors.textMuted }}> {p.code}</Text> : null}
            </Text>
            <Text style={[styles.sub, { color: colors.textSecondary }]} numberOfLines={1}>
              {KIND_LABELS[p.kind]} · {[p.city, p.region, p.country].filter(Boolean).join(', ')}
              {p.source === 'online' ? ' · OpenStreetMap' : ''}
            </Text>
          </View>
        </Pressable>
      ))}
      {query.trim().length > 0 && results.length === 0 && !loading ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>Nenhum lugar encontrado. Tente outro nome.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  display: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, minHeight: 56 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  value: { fontSize: 17, fontWeight: '600', marginTop: 1 },
  sub: { fontSize: 13, marginTop: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 10, minHeight: 44 },
  input: { flex: 1, fontSize: 17, marginLeft: 8, paddingVertical: 10 },
  result: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'transparent', minHeight: 44 },
  resultName: { fontSize: 16, fontWeight: '600' },
  empty: { paddingVertical: 12, fontSize: 14 },
});
