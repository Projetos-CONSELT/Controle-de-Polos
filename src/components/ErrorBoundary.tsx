import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <div className="max-w-md w-full p-6 rounded-lg border border-border bg-card shadow-lg text-center space-y-4 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Ocorreu um erro inesperado</h2>
            <p className="text-sm text-muted-foreground">
              A página encontrou uma falha ao renderizar. Clique no botão abaixo para tentar recarregar.
            </p>
            {this.state.error && (
              <div className="p-3 rounded bg-muted/60 text-xs font-mono text-muted-foreground text-left overflow-x-auto max-h-32">
                {this.state.error.message || "Erro desconhecido"}
              </div>
            )}
            <Button
              className="w-full"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Recarregar Página
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
