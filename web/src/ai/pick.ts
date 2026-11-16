// Which engine this copy of the app runs on. With the project settings (`.env.local`, see `.env.example`): Firebase AI
// Logic hybrid inference, started lazily. Without them (a bare clone): the rules-only engine, so every card that code
// decides alone still works and nothing ever tries to reach a model. Checked by tests/unit/no-config.test.ts.
import { NullEngine, type Engine } from '../../../core/engine';
import { LazyFirebaseEngine, type WebConfig } from './firebaseEngine';

export function pickEngine(cfg: WebConfig | null): Engine {
  return cfg ? new LazyFirebaseEngine(cfg) : new NullEngine();
}
