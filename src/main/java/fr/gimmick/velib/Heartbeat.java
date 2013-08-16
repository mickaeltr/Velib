package fr.gimmick.velib;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.annotation.WebFilter;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.logging.Logger;

/** Heartbeat prevents the (cloud) server hibernation by simulating requests from the outside */
@WebFilter("/*")
@WebServlet(urlPatterns = Heartbeat.URL)
public final class Heartbeat extends HttpServlet implements Filter {

    static final String URL = "/heartbeat";
    private static final Logger LOG = Logger.getLogger(Heartbeat.class.getName());
    private ScheduledExecutorService heart;
    private URL url;

    private static URL absoluteUrl(HttpServletRequest req) throws MalformedURLException {

        String rootUrl = req.getRequestURL().toString();
        int endIndex = rootUrl.length();

        // Strip out pathInfo
        if(req.getPathInfo() != null && rootUrl.endsWith(req.getPathInfo())) {
            endIndex -= req.getPathInfo().length();
            rootUrl = rootUrl.substring(0, endIndex);
        }
        // Strip out servletPath
        if(rootUrl.endsWith(req.getServletPath())) {
            endIndex -= req.getServletPath().length();
            rootUrl = rootUrl.substring(0, endIndex);
        }
        // Strip out end slashes
        while(rootUrl.endsWith("/")) {
            --endIndex;
            rootUrl = rootUrl.substring(0, endIndex);
        }

        return new URL(rootUrl + URL);
    }

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
        heart = Executors.newSingleThreadScheduledExecutor();
        heart.scheduleAtFixedRate(new Runnable() {
            @Override
            public void run() {
                if (url != null) {
                    HttpURLConnection beat = null;
                    LOG.info("Heart?");
                    try {
                        beat = (HttpURLConnection) url.openConnection();
                        beat.getContent();
                    } catch (IOException e) {
                        e.printStackTrace(System.err);
                    } finally {
                        if (beat != null) {
                            beat.disconnect();
                        }
                    }
                }
            }
        }, 1, 1, TimeUnit.HOURS);
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
        if(url == null && request instanceof HttpServletRequest) {
            url = absoluteUrl((HttpServletRequest) request);
        }
        chain.doFilter(request, response);
    }

    @Override
    public void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        LOG.info("Beat!");
        resp.getWriter().append("Heart? Beat!");
        resp.setStatus(HttpServletResponse.SC_OK);
        resp.setContentType("text/plain");
    }

    @Override
    public void destroy() {
        heart.shutdown();
    }
}
