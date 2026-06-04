import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>◈ SOMA</Text>
      <Text style={styles.tagline}>Meet yourself{'\n'}before meeting others.</Text>
      <View style={styles.divider} />
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Begin</Text>
      </TouchableOpacity>
    </View>
  )
}
const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:'#0C0C0F', alignItems:'center', justifyContent:'center', padding:32 },
  logo: { fontSize:52, fontWeight:'700', color:'#7B6EF6', marginBottom:16 },
  tagline: { fontSize:17, color:'#9B9AA6', fontStyle:'italic', textAlign:'center', lineHeight:26 },
  divider: { width:40, height:1, backgroundColor:'#7B6EF6', opacity:0.4, marginVertical:40 },
  button: { backgroundColor:'#7B6EF6', width:'100%', height:56, borderRadius:16, alignItems:'center', justifyContent:'center' },
  buttonText: { color:'#fff', fontSize:16, fontWeight:'600' },
})
