package fr.gimmick.velib;


import javax.servlet.ServletOutputStream;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.UnsupportedEncodingException;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Map.Entry;

/** Bridge to Vélib' open data API */
@WebServlet(urlPatterns = "/api/*")
public class VelibApiBridge extends HttpServlet {

    private static final String API_URL = "https://api.jcdecaux.com/vls/v1";

    private static final Map<String, String> API_PARAMETERS = new HashMap<String, String>() {{
        put("apiKey", "123f915ca9bfdb956117a82244e4b37203c55f07");
        put("contract", "Paris");
    }};

    public static void copy(InputStream inputStream, ServletOutputStream outputStream) throws IOException {
        try (BufferedReader bufferedReader = new BufferedReader(new InputStreamReader(inputStream))) {
            String line;
            while ((line = bufferedReader.readLine()) != null) {
                outputStream.println(line);
            }
        }
    }

    public static URL urlTo(String path) throws MalformedURLException, UnsupportedEncodingException {
        StringBuilder url = new StringBuilder(API_URL);
        if (path != null) {
            url.append(path);
        }
        if (!API_PARAMETERS.isEmpty()) {
            url.append('?');
            Iterator<Entry<String, String>> i = API_PARAMETERS.entrySet().iterator();
            while (i.hasNext()) {
                Entry<String, String> parameter = i.next();
                url.append(parameter.getKey()).append('=').append(parameter.getValue());
                if (i.hasNext()) {
                    url.append('&');
                }
            }
        }
        return new URL(url.toString());
    }

    @Override
    public void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        HttpURLConnection connection = (HttpURLConnection) urlTo(req.getPathInfo()).openConnection();
        try {
            resp.setStatus(connection.getResponseCode());
            resp.setContentType(connection.getContentType());
            resp.setCharacterEncoding(connection.getContentEncoding());
            try {
                copy(connection.getInputStream(), resp.getOutputStream());
            } catch (IOException e) {
                copy(connection.getErrorStream(), resp.getOutputStream());
            }
        } finally {
            connection.disconnect();
        }
    }
}
