import React, { useEffect } from 'react';
import {
    SafeAreaView,
    ScrollView,
    View,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
    Linking,
    Platform,
    Animated,
} from 'react-native';

const AboutUs = ({ onVisitStore }) => {

    const HERO = require('../images/Land_forming.jpg');
    const LOGO = require('../images/cowberry_world_logo.jpeg');
    const CERT1 = require('../images/cowberryLogo.png');
    const CERT2 = require('../images/cowberryLogo.png');

    const products = [
        'Flours',
        'Pulses',
        'Jaggery & Sugar',
        'Rock Salt',
        'Spices',
        'Tea & Coffee',
    ];

    // Animation setup
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const buttonScale = React.useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    const handleButtonPressIn = () => {
        Animated.spring(buttonScale, {
            toValue: 0.95,
            useNativeDriver: true,
        }).start();
    };

    const handleButtonPressOut = () => {
        Animated.spring(buttonScale, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    };

    const openEmail = () => {
        const email = 'hello@cowberry.com';
        const subject = encodeURIComponent('Contact from App');
        const url = `mailto:${email}?subject=${subject}`;
        Linking.openURL(url).catch(() => { });
    };

    return (
        <SafeAreaView style={styles.safe}>
            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View style={[styles.heroWrapper, { opacity: fadeAnim }]}>
                    <Image source={HERO} style={styles.hero} resizeMode="cover" />
                    <View style={styles.heroOverlay}>
                        <Text style={styles.heroText}>Organically Yours</Text>
                    </View>
                </Animated.View>

                <Animated.View style={[styles.brandRow, { opacity: fadeAnim }]}>
                    <Image source={LOGO} style={styles.logo} resizeMode="contain" />
                </Animated.View>

                <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
                    <Text style={styles.sectionTitle}>Our Story</Text>
                    <Text style={styles.paragraph}>
                        COWBERRY is a purpose-driven brand that brings you 100% certified and
                        traceable food products—directly from the farms. We believe that
                        true taste and wellness come from sustainable farming and a
                        transparent supply chain.
                    </Text>

                    <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Our Mission</Text>
                    <Text style={styles.paragraph}>
                        To empower farmers with fair value, preserve natural ingredients, and
                        provide families with safe, high-quality food that nourishes both
                        people and the planet.
                    </Text>

                    <Text style={[styles.sectionTitle, { marginTop: 24 }]}>What We Offer</Text>
                    <View style={styles.productsWrap}>
                        {products.map((p) => (
                            <Animated.View key={p} style={[styles.productBadge, { opacity: fadeAnim }]}>
                                <Text style={styles.productText}>{p}</Text>
                            </Animated.View>
                        ))}
                    </View>

                    <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Certifications & Quality</Text>
                    <Text style={styles.paragraph}>
                        Every COWBERRY product is tested and certified according to
                        internationally accepted standards. We maintain complete
                        traceability, quality testing, Certificates of Analysis (COA),
                        and lab reports for every batch.
                    </Text>

                    <View style={styles.certRow}>
                        <Image source={CERT1} style={styles.cert} />
                        <Image source={CERT2} style={styles.cert} />
                    </View>

                    <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Why Choose COWBERRY?</Text>
                    <View style={styles.list}>
                        <Text style={styles.listItem}>• Farm-to-fork traceability</Text>
                        <Text style={styles.listItem}>• Natural and minimally processed</Text>
                        <Text style={styles.listItem}>• Strictly lab tested and certified</Text>
                        <Text style={styles.listItem}>• Supporting smallholder farmers</Text>
                    </View>

                    <View style={styles.ctaRow}>
                        <TouchableOpacity
                            style={[styles.ctaButton, styles.primaryBtn]}
                            activeOpacity={0.8}
                            onPressIn={handleButtonPressIn}
                            onPressOut={handleButtonPressOut}
                            onPress={() => {
                                if (typeof onVisitStore === 'function') return onVisitStore();
                                const url = 'https://www.cowberry.com';
                                Linking.openURL(url).catch(() => { });
                            }}
                        >
                            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                                <Text style={styles.ctaText}>Our Store</Text>
                            </Animated.View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.ctaButton, styles.ghostBtn]}
                            activeOpacity={0.8}
                            onPressIn={handleButtonPressIn}
                            onPressOut={handleButtonPressOut}
                            onPress={openEmail}
                        >
                            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                                <Text style={styles.ghostText}>Email</Text>
                            </Animated.View>
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        © {new Date().getFullYear()} COWBERRY — Umbhel, Surat, Gujrat.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default AboutUs;

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#F5F6F5',
    },
    scrollContainer: {
        paddingBottom: 40,
    },
    heroWrapper: {
        width: '100%',
        height: 250,
        position: 'relative',
    },
    hero: {
        width: '100%',
        height: '100%',
    },
    heroOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 50, 30, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroText: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        letterSpacing: 1,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 4,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: -40,
    },
    logo: {
        width: 80,
        height: 80,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        borderWidth: 3,
        borderColor: '#FFFFFF',
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },
    brandText: {
        marginLeft: 10,
    },
    tagline: {
        fontSize: 13,
        color: '#4A6A4A',
        fontWeight: '500',
        // letterSpacing: 0.1,
        marginTop: 20,
    },
    card: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 20,
        marginVertical: 16,
        padding: 20,
        borderRadius: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        borderWidth: 1,
        borderColor: 'rgba(0, 100, 0, 0.05)',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A3C34',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    paragraph: {
        fontSize: 15,
        color: '#3D4F44',
        lineHeight: 22,
        opacity: 0.9,
    },
    productsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 12,
    },
    productBadge: {
        backgroundColor: '#E8F5E9',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 24,
        marginRight: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#C8E6C9',
    },
    productText: {
        fontSize: 14,
        color: '#0A5A3D',
        fontWeight: '600',
    },
    certRow: {
        flexDirection: 'row',
        marginTop: 12,
        justifyContent: 'flex-start',
    },
    cert: {
        width: 90,
        height: 60,
        marginRight: 12,
        resizeMode: 'contain',
    },
    list: {
        marginTop: 12,
    },
    listItem: {
        fontSize: 15,
        color: '#3D4F44',
        marginBottom: 8,
        lineHeight: 22,
    },
    ctaRow: {
        flexDirection: 'row',
        marginTop: 24,
        justifyContent: 'space-between',
    },
    ctaButton: {
        flex: 1,
        paddingVertical: Platform.OS === 'ios' ? 14 : 12,
        borderRadius: 16,
        alignItems: 'center',
        marginHorizontal: 6,
    },
    primaryBtn: {
        backgroundColor: '#087F5B',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    ctaText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 16,
    },
    ghostBtn: {
        borderWidth: 2,
        borderColor: '#087F5B',
        backgroundColor: 'transparent',
    },
    ghostText: {
        color: '#087F5B',
        fontWeight: '700',
        fontSize: 16,
    },
    footer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    footerText: {
        color: '#78909C',
        fontSize: 14,
        fontWeight: '500',
    },
});