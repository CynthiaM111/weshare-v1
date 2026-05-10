/**
 * AuthGate — shown when a protected tab is accessed without a session.
 * Replaces the tab content with a friendly sign-in prompt.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';

const ACCENT = '#FF6B35';
const TEAL = '#00C9B1';
const NAVY = '#08111F';

type Props = {
    icon: string;
    title: string;
    description: string;
    redirectPath: string;
};

export function AuthGate({ icon, title, description, redirectPath }: Props) {
    const router = useRouter();
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
    const textPri = isDark ? '#FFF' : NAVY;
    const textSub = isDark ? 'rgba(255,255,255,0.50)' : 'rgba(8,17,31,0.48)';
    const hair = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(8,17,31,0.09)';
    const bg = isDark ? NAVY : '#F5F7FA';

    return (
        <View style={[styles.root, { backgroundColor: bg }]}>
            <LinearGradient
                colors={[ACCENT + '18', 'transparent']}
                style={styles.blob}
            />

            <View style={styles.inner}>
                {/* Icon */}
                <View style={[styles.iconWrap, { backgroundColor: ACCENT + '14', borderColor: ACCENT + '28' }]}>
                    <IconSymbol name={icon as any} size={36} color={ACCENT} />
                </View>

                <ThemedText style={[styles.title, { color: textPri }]}>{title}</ThemedText>
                <ThemedText style={[styles.desc, { color: textSub }]}>{description}</ThemedText>

                {/* Sign in CTA */}
                <Pressable
                    onPress={() => router.push({
                        pathname: '/auth',
                        params: { redirect: redirectPath },
                    } as any)}
                    style={styles.btn}
                >
                    <LinearGradient
                        colors={[ACCENT, '#FF4500']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={styles.btnGrad}
                    >
                        <IconSymbol name="person.badge.plus" size={17} color="#fff" />
                        <ThemedText style={styles.btnText}>Sign in / Create account</ThemedText>
                    </LinearGradient>
                </Pressable>

                {/* Feature hints */}
                <View style={[styles.featureList, { borderColor: hair }]}>
                    {[
                        { icon: 'lock.open.fill', label: 'Free to sign up — just your phone number' },
                        { icon: 'clock.fill', label: 'Takes less than a minute' },
                        { icon: 'checkmark.seal.fill', label: 'SMS verification keeps your account secure' },
                    ].map(f => (
                        <View key={f.label} style={styles.featureRow}>
                            <View style={[styles.featureIcon, { backgroundColor: TEAL + '15' }]}>
                                <IconSymbol name={f.icon as any} size={13} color={TEAL} />
                            </View>
                            <ThemedText style={[styles.featureText, { color: textSub }]}>{f.label}</ThemedText>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    blob: { position: 'absolute', top: 0, left: 0, right: 0, height: 280 },
    inner: {
        flex: 1, justifyContent: 'center',
        alignItems: 'center', paddingHorizontal: 28, gap: 16,
    },
    iconWrap: {
        width: 84, height: 84, borderRadius: 24,
        alignItems: 'center', justifyContent: 'center', borderWidth: 1,
    },
    title: { fontSize: 24, fontWeight: '900', textAlign: 'center' },
    desc: { fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 20 },
    btn: { borderRadius: 16, overflow: 'hidden', width: '100%', marginTop: 4 },
    btnGrad: {
        height: 54, flexDirection: 'row',
        alignItems: 'center', justifyContent: 'center', gap: 10,
    },
    btnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
    featureList: {
        width: '100%', borderRadius: 16, borderWidth: 1,
        padding: 14, gap: 12, marginTop: 4,
    },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    featureIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    featureText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
}) as any;
