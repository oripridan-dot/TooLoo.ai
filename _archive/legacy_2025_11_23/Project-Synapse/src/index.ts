import * as path from 'path';
import { SystemModel } from './cortex/system-model';
import { ContextResonanceEngine } from './cortex/context-resonance';
import { ProviderEngine } from './precog/provider-engine';
import { Oracle } from './precog/oracle';
import { NexusInterface } from './nexus/interface';
import { SynapseBus } from './core/bus/event-bus';

async function main() {
    console.log('🚀 Project Synapse: Boot sequence initiated...');
    
    // 1. Initialize Bus
    const bus = SynapseBus.getInstance();
    
    // 2. Initialize Cortex
    const rootDir = path.resolve(__dirname, '..');
    const cortex = new SystemModel(rootDir);
    await cortex.initialize();

    const resonanceEngine = new ContextResonanceEngine();
    console.log('🧠 Cortex: Context Resonance Engine Online.');
    
    // 3. Initialize Precog
    const precog = new ProviderEngine();
    const oracle = new Oracle();
    console.log('🔮 Precog: Provider Engine & Oracle Online.');

    // 4. Initialize Nexus
    const nexus = new NexusInterface();
    await nexus.start();

    console.log('✨ Project Synapse is fully operational.');
}

main().catch(console.error);
