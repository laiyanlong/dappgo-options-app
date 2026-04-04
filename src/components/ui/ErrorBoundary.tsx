import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Class component that catches render errors and displays a retry UI.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleRetry = (): void => {
        this.setState({ hasError: false, error: null });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <View style={styles.container}>
                    <Text style={styles.icon}>!</Text>
                    <Text style={styles.title}>Something went wrong</Text>
                    <Text style={styles.message}>
                        {this.state.error?.message ?? 'An unexpected error occurred.'}
                    </Text>
                    <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={this.handleRetry}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.retryText}>Tap to retry</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        backgroundColor: '#0d0d0d',
    },
    icon: {
        fontSize: 40,
        fontWeight: '700',
        color: '#ff5252',
        marginBottom: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#e0e0e0',
        marginBottom: 8,
    },
    message: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    retryBtn: {
        paddingHorizontal: 28,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: '#6c63ff',
    },
    retryText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
});
