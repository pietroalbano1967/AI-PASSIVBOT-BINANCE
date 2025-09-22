// services/dashboard-state.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface DashboardState {
  candles: any[];
  tickers: any[]; // ✅ Assicurati che esista
  signals: any[];
  orders: any[];
  currentSymbol: string;
  ma20Data: any[];
  ma50Data: any[];
  volumeData: any[];
  rsiData: any[];
  activeConnections: {
    signals: boolean;
    tickers: boolean; // ✅ Aggiungi tickers
    candles: boolean;
  };
  lastUpdateTimestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardStateService {
  // ✅ Stato iniziale completo
  private initialState: DashboardState = {
    candles: [],
    tickers: [],
    signals: [],
    orders: [],
    currentSymbol: 'BTCUSDT',
    ma20Data: [],
    ma50Data: [],
    volumeData: [],
    rsiData: [],
    activeConnections: {
      signals: false,
      tickers: false,
      candles: false
    },
    lastUpdateTimestamp: Date.now()
  };

  private stateSubject = new BehaviorSubject<DashboardState>(this.initialState);
  state$ = this.stateSubject.asObservable();

  private preserveConnections = false;
  private saveTimer?: any;

  constructor() {
    this.loadStateFromStorage();
  }

  private loadStateFromStorage() {
    try {
      const savedState = localStorage.getItem('dashboardState');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        
        // ✅ Mantieni le connessioni come disattive al caricamento
        const enhancedState = {
          ...parsedState,
          activeConnections: {
            signals: false,
            tickers: false,
            candles: false
          },
          lastUpdateTimestamp: Date.now()
        };
        
        this.stateSubject.next(enhancedState);
        console.log('📂 Stato caricato dal localStorage');
      }
    } catch (error) {
      console.error('❌ Errore caricamento stato:', error);
      localStorage.removeItem('dashboardState'); // Ripristina se corrotto
    }
  }

  updateState(partialState: Partial<DashboardState>) {
    const currentState = this.stateSubject.value;
    const newState = { 
      ...currentState, 
      ...partialState,
      lastUpdateTimestamp: Date.now() // ✅ Aggiorna sempre il timestamp
    };
    
    this.stateSubject.next(newState);
    this.debouncedSave(newState);
  }

  private debouncedSave(state: DashboardState) {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    
    this.saveTimer = setTimeout(() => {
      try {
        // ✅ Escludi dati troppo voluminosi o temporanei
        const stateToSave = {
          ...state,
          candles: state.candles.slice(-100), // Salva solo ultime 100 candele
          tickers: state.tickers.slice(-50),  // Solo ultimi 50 tickers
          signals: state.signals.slice(-100), // Solo ultimi 100 segnali
          // ✅ Non salvare lo stato delle connessioni
          activeConnections: {
            signals: false,
            tickers: false,
            candles: false
          }
        };
        
        localStorage.setItem('dashboardState', JSON.stringify(stateToSave));
        console.log('💾 Stato salvato nel localStorage');
      } catch (error) {
        console.error('❌ Errore salvataggio stato:', error);
      }
    }, 3000); // Salva ogni 3 secondi invece di 5
  }

  getCurrentState(): DashboardState {
    return this.stateSubject.value;
  }

  // ✅ METODI PER GESTIONE CONNESSIONI PERSISTENTI
  setPreserveConnections(preserve: boolean) {
    this.preserveConnections = preserve;
    console.log(`🔗 Preserve connections: ${preserve}`);
    
    if (!preserve) {
      // Se disattiviamo la preservazione, resettiamo lo stato connessioni
      this.updateState({
        activeConnections: {
          signals: false,
          tickers: false,
          candles: false
        }
      });
    }
  }

  

  

  clearState() {
    // Non pulire se preserviamo le connessioni
    if (this.preserveConnections) {
      console.log('🔄 Stato preservato durante navigazione');
      
      // ✅ Mantieni solo i dati essenziali, resetta le connessioni
      this.updateState({
        activeConnections: {
          signals: false,
          tickers: false,
          candles: false
        }
      });
      return;
    }
    
    // ✅ Pulizia completa solo quando esplicitamente richiesto
    console.log('🧹 Pulizia completa dello stato');
    this.stateSubject.next(this.initialState);
    localStorage.removeItem('dashboardState');
  }

  // ✅ METODI PER RECUPERO STATO RAPIDO
  // dashboard-state.service.ts - AGGIUNGI
restoreComponentState(componentName: string, symbol: string): any[] {
  try {
    const state = this.getCurrentState();
    
    switch (componentName) {
      case 'rsi':
        return (state.signals || [])
          .filter(signal => signal.symbol === symbol && signal.rsi !== undefined)
          .map(signal => ({
            t: signal.t,
            rsi: signal.rsi,
            symbol: signal.symbol
          }))
          .slice(-50); // Ultimi 50 punti
          
      case 'macd':
        return (state.signals || [])
          .filter(signal => signal.symbol === symbol && signal.macd)
          .slice(-50);
          
      default:
        return [];
    }
  } catch (error) {
    console.error('❌ Errore restoreComponentState:', error);
    return [];
  }
}
  // ✅ Verifica se i dati sono ancora validi (meno di 5 minuti)
  

  // ✅ Pulisci dati vecchi (più di 1 ora)
  cleanupOldData() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const state = this.getCurrentState();
    
    if (state.lastUpdateTimestamp < oneHourAgo) {
      console.log('🧹 Pulizia dati obsoleti (>1 ora)');
      this.clearState();
    }
  }
  // AGGIUNGI al dashboard-state.service.ts
isDataFresh(): boolean {
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  return this.stateSubject.value.lastUpdateTimestamp > fiveMinutesAgo;
}

// Se usi Ionic, aggiungi anche:
setConnectionStatus(type: 'signals' | 'tickers' | 'candles', isConnected: boolean) {
  const currentState = this.stateSubject.value;
  this.updateState({
    activeConnections: {
      ...currentState.activeConnections,
      [type]: isConnected
    }
  });
}

getConnectionStatus(type: 'signals' | 'tickers' | 'candles'): boolean {
  return this.stateSubject.value.activeConnections?.[type] || false;
}
}