const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxODY5NjAsImV4cCI6MjA3Mjc2Mjk2MH0.HA7ujjknDa-97z-vC-vOZJm5rQ7PYXqn--rdiZoPXcY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeSchema() {
  try {
    console.log('=== ANALYZING SALES ORDERS TABLE SCHEMA ===\n');
    
    // Get table information for orders table
    const { data: tablesData, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_type')
      .eq('table_schema', 'public')
      .like('table_name', '%order%');
    
    if (tablesError) {
      console.error('Error fetching tables:', tablesError);
      return;
    }
    
    console.log('ORDER-RELATED TABLES:');
    tablesData.forEach(table => {
      console.log(`- ${table.table_name} (${table.table_type})`);
    });
    
    console.log('\n=== ORDERS TABLE COLUMNS ===\n');
    
    // Get column information for orders table
    const { data: columnsData, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'orders')
      .order('ordinal_position');
    
    if (columnsError) {
      console.error('Error fetching columns:', columnsError);
      return;
    }
    
    if (columnsData && columnsData.length > 0) {
      console.log('ORDERS TABLE STRUCTURE:');
      columnsData.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'} ${col.column_default ? `DEFAULT: ${col.column_default}` : ''}`);
      });
    } else {
      console.log('No orders table found or no columns returned');
    }
    
    console.log('\n=== RELATED TABLES ===\n');
    
    // Check other related tables
    const relatedTables = ['dealer_memberships', 'profiles', 'dealerships', 'services'];
    
    for (const tableName of relatedTables) {
      console.log(`\n${tableName.toUpperCase()} TABLE STRUCTURE:`);
      
      const { data: tableColumns, error: tableError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', 'public')
        .eq('table_name', tableName)
        .order('ordinal_position');
      
      if (tableError) {
        console.error(`Error fetching ${tableName} columns:`, tableError);
        continue;
      }
      
      if (tableColumns && tableColumns.length > 0) {
        tableColumns.forEach(col => {
          console.log(`- ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
        });
      } else {
        console.log(`No ${tableName} table found or no columns returned`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

analyzeSchema();