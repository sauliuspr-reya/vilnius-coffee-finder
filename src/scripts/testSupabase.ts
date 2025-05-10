import { supabase } from '../lib/supabase';

async function testSupabaseConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Simple query to test the connection
    const { data, error } = await supabase.from('coffee_places').select('*').limit(1);
    
    if (error) {
      console.error('Error connecting to Supabase:', error);
      return;
    }
    
    console.log('Successfully connected to Supabase!');
    console.log('Data:', data);
    
    // Try to create the table if it doesn't exist
    console.log('Attempting to create coffee_places table if it doesn\'t exist...');
    const { error: createTableError } = await supabase.rpc('create_coffee_places_table');
    
    if (createTableError) {
      console.error('Error creating table:', createTableError);
      console.log('You may need to run the SQL script manually in the Supabase dashboard.');
    } else {
      console.log('Table created or already exists!');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Execute the function
testSupabaseConnection()
  .then(() => console.log('Test completed'))
  .catch(error => console.error('Test failed:', error));
