package expo.modules.tvremote

import android.net.Network
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.Socket
import java.security.KeyStore
import java.security.Principal
import java.security.PrivateKey
import java.security.cert.X509Certificate
import java.security.interfaces.RSAPublicKey
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLSocket
import javax.net.ssl.X509KeyManager
import javax.net.ssl.X509TrustManager

internal object Transport {
  fun localAddress(host: String): InetAddress {
    val literal = host.substringBefore('%')
    val numeric = if (literal.contains(':')) literal.matches(Regex("[0-9a-fA-F:]+"))
      else literal.split('.').let { parts -> parts.size == 4 && parts.all { it.matches(Regex("[0-9]{1,3}")) && it.toInt() in 0..255 } }
    if (!numeric) throw TVFailure("networkUnavailable")
    // Parse numeric literals only; never resolve an arbitrary DNS name before applying local policy.
    val address = try { InetAddress.getByName(host) } catch (_: java.net.UnknownHostException) { throw TVFailure("networkUnavailable") }
    val localIPv6 = address is java.net.Inet6Address && (address.address[0].toInt() and 254) == 252
    if ((!address.isSiteLocalAddress && !address.isLinkLocalAddress && !localIPv6) || address.isLoopbackAddress || address.isMulticastAddress) throw TVFailure("networkUnavailable")
    return address
  }
  fun open(network: Network, host: String, port: Int, identity: Identity, pin: String?, register: (Socket) -> Unit): SSLSocket {
    val address = localAddress(host)
    val keyManager = object : X509KeyManager {
      override fun getClientAliases(keyType: String?, issuers: Array<out Principal>?): Array<String> = arrayOf(identity.reference)
      override fun chooseClientAlias(keyType: Array<out String>?, issuers: Array<out Principal>?, socket: Socket?): String = identity.reference
      override fun getServerAliases(keyType: String?, issuers: Array<out Principal>?): Array<String>? = null
      override fun chooseServerAlias(keyType: String?, issuers: Array<out Principal>?, socket: Socket?): String? = null
      override fun getCertificateChain(alias: String?): Array<X509Certificate> = arrayOf(identity.certificate)
      override fun getPrivateKey(alias: String?): PrivateKey = identity.key
    }
    // A missing pin is allowed ONLY by the pairing call site. Control always loads a stored pin.
    val trust = object : X509TrustManager {
      override fun getAcceptedIssuers(): Array<X509Certificate> = emptyArray()
      override fun checkClientTrusted(chain: Array<out X509Certificate>?, authType: String?) { throw TVFailure("authenticationFailed") }
      override fun checkServerTrusted(chain: Array<out X509Certificate>?, authType: String?) {
        val certificate = chain?.firstOrNull() ?: throw TVFailure("authenticationFailed")
        certificate.checkValidity()
        val rsa = certificate.publicKey as? RSAPublicKey ?: throw TVFailure("authenticationFailed")
        if (rsa.modulus.bitLength() < 2048) throw TVFailure("authenticationFailed")
        if (pin != null && !java.security.MessageDigest.isEqual(pin.toByteArray(), Credentials.pin(certificate).toByteArray())) throw TVFailure("identityChanged")
      }
    }
    val context = SSLContext.getInstance("TLS").apply { init(arrayOf(keyManager), arrayOf(trust), null) }
    val plain = Socket()
    register(plain)
    try {
      network.bindSocket(plain)
      plain.connect(InetSocketAddress(address, port), 10000)
      val socket = context.socketFactory.createSocket(plain, host, port, true) as SSLSocket
      register(socket)
      socket.enabledProtocols = socket.supportedProtocols.filter { it == "TLSv1.2" || it == "TLSv1.3" }.toTypedArray()
      socket.soTimeout = 10000
      socket.startHandshake()
      return socket
    } catch (error: Exception) { plain.close(); throw error }
  }
}
