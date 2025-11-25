#!/usr/bin/env node
/**
 * Apply migration using Supabase MCP Server programmatically
 * This bypasses the need for direct MCP tool access in Claude Code
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROJECT_REF = 'swfnnrpzpkdypbrzmgnr';
const ACCESS_TOKEN = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzE4Njk2MCwiZXhwIjoyMDcyNzYyOTYwfQ.ud57lvk528bfk8lb-D5CGn2UeN6_fLuEXXwd-CKaYrE';

async function callMCPTool(toolName, args) {
  return new Promise((resolve, reject) => {
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };

    const mcp = spawn('npx', [
      '-y',
      '@supabase/mcp-server-supabase@latest',
      `--project-ref=${PROJECT_REF}`,
      `--access-token=${ACCESS_TOKEN}`
    ], {
      env: {
        ...process.env,
        SUPABASE_ACCESS_TOKEN: ACCESS_TOKEN,
        SUPABASE_SERVICE_ROLE_KEY: ACCESS_TOKEN
      }
    });

    let stdout = '';
    let stderr = '';

    mcp.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    mcp.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    mcp.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`MCP server exited with code ${code}\nStderr: ${stderr}`));
        return;
      }

      try {
        const lines = stdout.split('\n').filter(line => line.trim());
        const jsonLine = lines.find(line => line.startsWith('{'));
        if (!jsonLine) {
          reject(new Error(`No JSON response found in stdout: ${stdout}`));
          return;
        }
        const response = JSON.parse(jsonLine);
        resolve(response);
      } catch (err) {
        reject(new Error(`Failed to parse MCP response: ${err.message}\nStdout: ${stdout}`));
      }
    });

    mcp.stdin.write(JSON.stringify(request));
    mcp.stdin.end();
  });
}

async function main() {
  console.log('🤖 Claude Migration Applicator - Using MCP Server\n');

  // Read the test migration
  const sqlPath = join(__dirname, '..', 'supabase', 'migrations', '20251125013919_test_claude_can_apply_migrations.sql');
  let sql;
  try {
    sql = readFileSync(sqlPath, 'utf-8');
  } catch (err) {
    console.error(`❌ Failed to read migration file: ${err.message}`);
    process.exit(1);
  }

  console.log('📋 Migration SQL loaded\n');
  console.log('📡 Calling MCP tool: execute_sql...\n');

  try {
    const response = await callMCPTool('execute_sql', { query: sql });

    if (response.result && response.result.isError) {
      console.error('❌ MCP returned error:');
      console.error(JSON.stringify(response.result.content, null, 2));
      process.exit(1);
    }

    console.log('✅ Migration executed successfully!');
    console.log('\n📊 Result:');
    console.log(JSON.stringify(response.result, null, 2));

    console.log('\n🎉 SUCCESS! Claude applied the migration programmatically via MCP!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
