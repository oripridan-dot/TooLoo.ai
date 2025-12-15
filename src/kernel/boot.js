/**
 * @file TooLoo.ai Skills OS - Bootstrap
 * @description Boots the complete Skills OS Kernel
 * @version 1.1.0.0
 * @skill-os true
 * @updated 2025-12-15
 *
 * This is the entry point for Skills OS.
 * Run with: pnpm boot
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { kernel } from './kernel.js';
import { registry } from './registry.js';
import { router } from './router.js';
import { startKernelServer } from './server.js';
import { registerBuiltInSkills } from '../skills/index.js';
// Get version info
const __dirname = dirname(fileURLToPath(import.meta.url));
const versionPath = join(__dirname, '../../version.json');
let versionInfo = { version: '1.0.0', codename: 'Genesis', build: 1 };
try {
    versionInfo = JSON.parse(readFileSync(versionPath, 'utf-8'));
}
catch {
    // Use defaults
}
// =============================================================================
// BOOT SEQUENCE
// =============================================================================
async function boot() {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                                                              ║');
    console.log('║   🧠 TooLoo.ai SKILLS OS                                     ║');
    console.log(`║   Version: ${versionInfo.version} (${versionInfo.codename})                                  ║`);
    console.log('║                                                              ║');
    console.log('║   "Everything is a Skill"                                    ║');
    console.log('║                                                              ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
    try {
        // 1. Register built-in skills
        console.log('[Boot] Step 1: Loading skills from YAML...');
        registerBuiltInSkills();
        // 2. Initialize the kernel (runs skill onLoad hooks)
        console.log('[Boot] Step 2: Initializing kernel...');
        await kernel.boot();
        // 3. Configure router
        console.log('[Boot] Step 3: Configuring intent router...');
        router.configure({
            defaultSkillId: 'core.chat',
            minConfidence: 0.3,
            useClassifier: true,
        });
        // 4. Start HTTP server
        console.log('[Boot] Step 4: Starting kernel server...');
        const port = parseInt(process.env['KERNEL_PORT'] ?? '4002', 10);
        await startKernelServer(port);
        // 5. Print status
        const skills = registry.getAll();
        const memoryStats = kernel.getMemoryStats();
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');
        console.log('  ✅ Skills OS is ONLINE');
        console.log('');
        console.log(`  📊 Registered Skills: ${skills.length}`);
        skills.forEach((skill) => {
            console.log(`     • ${skill.id} - ${skill.name}`);
        });
        console.log('');
        console.log(`  🧠 Memory Cortex:`);
        console.log(`     • Active Sessions: ${memoryStats.activeSessions}`);
        console.log(`     • Session Memories: ${memoryStats.byTier['session']}`);
        console.log(`     • Short-Term Memories: ${memoryStats.byTier['short-term']}`);
        console.log('');
        console.log(`  🌐 Kernel API: http://localhost:${port}/synapsys`);
        console.log('');
        console.log('  📖 Quick Test:');
        console.log(`     curl http://localhost:${port}/synapsys/skills`);
        console.log(`     curl http://localhost:${port}/synapsys/status`);
        console.log(`     curl "http://localhost:${port}/synapsys/route?text=hello"`);
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');
    }
    catch (error) {
        console.error('[Boot] ❌ Failed to boot:', error);
        process.exit(1);
    }
}
// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================
process.on('SIGINT', async () => {
    console.log('\n[Boot] Received SIGINT, shutting down...');
    await kernel.shutdown();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('\n[Boot] Received SIGTERM, shutting down...');
    await kernel.shutdown();
    process.exit(0);
});
// =============================================================================
// RUN
// =============================================================================
boot();
//# sourceMappingURL=boot.js.map