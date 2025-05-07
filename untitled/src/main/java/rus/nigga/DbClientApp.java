package com.example.dbclient;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import javafx.application.Application;
import javafx.application.Platform;
import javafx.beans.property.SimpleStringProperty;
import javafx.collections.ListChangeListener;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Node;
import javafx.scene.Scene;
import javafx.scene.control.*;
import javafx.scene.image.ImageView;
import javafx.scene.input.ClipboardContent;
import javafx.scene.input.Dragboard;
import javafx.scene.input.TransferMode;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.shape.Circle;
import javafx.scene.text.Font;
import javafx.scene.text.Text;
import javafx.stage.Modality;
import javafx.stage.Stage;
import javafx.stage.Window;
import com.example.dbclient.SavedQuery;
import com.example.dbclient.DbConnectionInfo;

import javafx.scene.image.Image;
import java.io.File;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Set;
import java.util.prefs.Preferences;

public class DbClientApp extends Application {

    private List<DbConnectionInfo> connections = new ArrayList<>();
    private ListView<DbConnectionInfo> connectionListView;
    private List<SavedQuery> savedQueries = new ArrayList<>();
    private ComboBox<SavedQuery> querySelector;
    private Connection currentConnection;
    private VBox centerArea;
    private TextArea queryArea;
    private TableView<List<String>> resultTable;
    private TextArea logArea;
    private Scene scene;

    private String currentTheme = "light";
    private double currentFontSize = 12;

    private final ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());
    private final File connectionsFile = Paths.get("connections.json").toFile();
    private final File queriesFile = Paths.get("queries.json").toFile();

    private final Preferences preferences = Preferences.userRoot().node(this.getClass().getName());

    @Override
    public void start(Stage primaryStage) {
        primaryStage.setTitle("DB Client");
        primaryStage.getIcons().add(new Image(getClass().getResourceAsStream("/icon.png")));

        BorderPane root = new BorderPane();

        // Список подключений
        connectionListView = new ListView<>();
        connectionListView.getSelectionModel().selectedItemProperty().addListener((obs, oldVal, newVal) -> connectToDatabase());
        enableConnectionDnD();

        Button addConnectionButton = new Button("Создать подключение");
        addConnectionButton.setOnAction(e -> openAddConnectionDialog(primaryStage));

        Button testConnectionButton = new Button("Тест подключения");
        testConnectionButton.setOnAction(e -> testConnection());

        Button deleteConnectionButton = new Button("Удалить подключение");
        deleteConnectionButton.setOnAction(e -> deleteSelectedConnection());

        VBox connectionSection = new VBox(10,
                new HBox(10, addConnectionButton, testConnectionButton, deleteConnectionButton),
                new Label("Подключения:"),
                connectionListView
        );
        /**
         * Ширина правой панели (подключения + кнопки)
         * connectionSection.setPrefWidth(300);
         */
        connectionSection.setPadding(new Insets(10));
        connectionSection.setPrefWidth(300);

        // Выпадающий список запросов и кнопки
        querySelector = new ComboBox<>();
        querySelector.setPromptText("Выберите запрос");
        querySelector.setOnAction(e -> loadSelectedQuery());

        Button saveQueryButton = new Button("Сохранить запрос");
        saveQueryButton.setOnAction(e -> saveCurrentQuery());

        Button executeQueryButton = new Button("Выполнить запрос");
        executeQueryButton.setOnAction(e -> executeQuery());

        Button deleteQueryButton = new Button("Удалить запрос");
        deleteQueryButton.setOnAction(e -> deleteSelectedQuery());

        HBox queryBox = new HBox(10, querySelector, saveQueryButton, executeQueryButton, deleteQueryButton);
        queryBox.setPadding(new Insets(10));
/**
 * Изменение высоты окна ввода запроса
 * queryArea.setPrefHeight(200);
 */
        queryArea = new TextArea();
        queryArea.setPrefHeight(400);
        queryArea.setWrapText(true);

        VBox querySection = new VBox(10,
                new HBox(10, querySelector, saveQueryButton, executeQueryButton, deleteQueryButton),
                new Label("SQL-запрос:"),
                queryArea
        );
        /**
         * Ширина левой панели (редактор + кнопки)
         * querySection.setPrefWidth(700);
         */
        querySection.setPadding(new Insets(10));
        querySection.setPrefWidth(700);

        HBox topContent = new HBox(10, querySection, connectionSection);

        // Настройки
//        Button settingsButton = new Button("⚙");
        Image settingsIcon = new Image(getClass().getResourceAsStream("/settings_icon.png"));
        ImageView settingsIconView = new ImageView(settingsIcon);
        Button settingsButton = new Button("", settingsIconView);
        settingsButton.setStyle("-fx-background-color: transparent;");
        settingsButton.setOnAction(e -> openSettingsDialog(primaryStage));

        BorderPane topBar = new BorderPane();
        topBar.setLeft(topContent);
        topBar.setRight(settingsButton);
        BorderPane.setMargin(settingsButton, new Insets(10));

        /**Высота окна вывода результата запроса
         * resultTable.setPrefHeight(400);
         */
        // Таблица результатов
        resultTable = new TableView<>();
        resultTable.setPrefHeight(500);

        centerArea = new VBox(10, resultTable);
        centerArea.setPadding(new Insets(10));

        // Логи
        logArea = new TextArea();
        logArea.setEditable(false);
        logArea.setPrefHeight(150);

        root.setTop(topBar);
        root.setCenter(centerArea);
        root.setBottom(logArea);

        scene = new Scene(root, 1200, 850);
        primaryStage.setScene(scene);
        primaryStage.show();

        loadConnections();
        loadQueries();
        loadSettings();
    }

    private void enableConnectionDnD() {
        connectionListView.setCellFactory(lv -> new ListCell<DbConnectionInfo>() {
            private final HBox container = new HBox();
            private final Label nameLabel = new Label();
            private final Circle statusIndicator = new Circle(5);

            {
                // Настройка элементов
                statusIndicator.setStroke(Color.TRANSPARENT);
                statusIndicator.setFill(Color.GRAY); // По умолчанию серый
                container.getChildren().addAll(nameLabel, statusIndicator);
                container.setSpacing(5);
                container.setAlignment(Pos.CENTER_LEFT);
                setGraphic(container);
            }

            @Override
            protected void updateItem(DbConnectionInfo item, boolean empty) {
                super.updateItem(item, empty);
                if (empty || item == null) {
                    setText(null);
                    setGraphic(null);
                } else {
                    nameLabel.setText(item.getName());
                    setGraphic(container);
                }
            }
        });
    }

    private void updateConnectionStatus(DbConnectionInfo connection, boolean isSuccess) {
        Platform.runLater(() -> {
            for (int i = 0; i < connectionListView.getItems().size(); i++) {
                if (connectionListView.getItems().get(i).equals(connection)) {
                    // Получаем все видимые ячейки
                    Set<Node> cells = connectionListView.lookupAll(".list-cell");
                    int cellIndex = 0;
                    for (Node node : cells) {
                        if (node instanceof ListCell) {
                            ListCell<DbConnectionInfo> cell = (ListCell<DbConnectionInfo>) node;
                            if (cellIndex == i) {
                                // Нашли нужную ячейку
                                if (cell.getGraphic() instanceof HBox) {
                                    HBox container = (HBox) cell.getGraphic();
                                    if (container.getChildren().size() > 1) {
                                        Circle indicator = (Circle) container.getChildren().get(1);
                                        indicator.setFill(isSuccess ? Color.GREEN : Color.RED);
                                    }
                                }
                                break;
                            }
                            cellIndex++;
                        }
                    }
                    break;
                }
            }
        });
    }

    private void openSettingsDialog(Window owner) {

        Stage dialog = new Stage();
        dialog.initModality(Modality.APPLICATION_MODAL);
        dialog.initOwner(owner);
        dialog.setTitle("Настройки");
        dialog.getIcons().add(new Image(getClass().getResourceAsStream("/icon.png")));

        Slider fontSizeSlider = new Slider(10, 30, currentFontSize);
        fontSizeSlider.setShowTickLabels(true);
        fontSizeSlider.setShowTickMarks(true);

        ToggleGroup themeGroup = new ToggleGroup();
        RadioButton lightTheme = new RadioButton("Светлая тема");
        RadioButton darkTheme = new RadioButton("Тёмная тема");
        lightTheme.setToggleGroup(themeGroup);
        darkTheme.setToggleGroup(themeGroup);

        if ("dark".equals(currentTheme)) {
            darkTheme.setSelected(true);
        } else {
            lightTheme.setSelected(true);
        }

        Button applyButton = new Button("Применить");
        applyButton.setOnAction(e -> {
            currentFontSize = fontSizeSlider.getValue();
            currentTheme = darkTheme.isSelected() ? "dark" : "light";

            preferences.putDouble("fontSize", currentFontSize);
            preferences.put("theme", currentTheme);

            // Применяем настройки ко всем открытым окнам
            applySettings(scene);
            applySettings(dialog.getScene());

            dialog.close();
        });

        VBox vbox = new VBox(10, new Label("Размер шрифта:"), fontSizeSlider, lightTheme, darkTheme, applyButton);
        vbox.setPadding(new Insets(10));

        Scene dialogScene = new Scene(vbox);
        applySettings(dialogScene); // Применяем текущие настройки к диалогу
        dialog.setScene(dialogScene);
        dialog.showAndWait();
    }

    private void loadSettings() {
        currentFontSize = preferences.getDouble("fontSize", 12);
        currentTheme = preferences.get("theme", "light");

        applySettings(scene);
    }

    private void applySettings(Scene sceneToStyle) {
        if (sceneToStyle != null) {
            sceneToStyle.getRoot().setStyle("-fx-font-size: " + currentFontSize + "px;");

            if ("dark".equals(currentTheme)) {
                sceneToStyle.getRoot().setStyle("-fx-base: #2b2b2b; -fx-background: #2b2b2b; -fx-text-fill: #ffffff;");
            } else {
                sceneToStyle.getRoot().setStyle("");
            }
        }
    }

    private void deleteSelectedConnection() {
        DbConnectionInfo selected = connectionListView.getSelectionModel().getSelectedItem();
        if (selected != null) {
            connections.remove(selected);
            connectionListView.getItems().remove(selected);
            saveConnections();
            log("Удалено подключение: " + selected.getName());
        }
    }

    private void deleteSelectedQuery() {
        SavedQuery selected = querySelector.getValue();
        if (selected != null) {
            savedQueries.remove(selected);
            querySelector.getItems().remove(selected);
            saveQueries();
            log("Удалён запрос: " + selected.getName());
        }
    }

    private void openAddConnectionDialog(Window owner) {
        Stage dialog = new Stage();
        dialog.initModality(Modality.APPLICATION_MODAL);
        dialog.initOwner(owner);
        dialog.setTitle("Создать подключение");

        TextField nameField = new TextField();
        ComboBox<String> typeField = new ComboBox<>();
        typeField.getItems().addAll("Oracle", "PostgreSQL");
        TextField urlField = new TextField();
        TextField usernameField = new TextField();
        PasswordField passwordField = new PasswordField();

        Button saveButton = new Button("Сохранить");
        saveButton.setOnAction(e -> {
            DbConnectionInfo info = new DbConnectionInfo(
                    nameField.getText(),
                    typeField.getValue(),
                    urlField.getText(),
                    usernameField.getText(),
                    passwordField.getText()
            );
            connections.add(info);
            connectionListView.getSelectionModel().getSelectedItem();
            saveConnections();
            dialog.close();
        });

        VBox vbox = new VBox(10,
                new Label("Название:"), nameField,
                new Label("Тип подключения:"), typeField,
                new Label("JDBC URL:"), urlField,
                new Label("Логин:"), usernameField,
                new Label("Пароль:"), passwordField,
                saveButton
        );
        vbox.setPadding(new Insets(10));

        Scene dialogScene = new Scene(vbox);
        applySettings(dialogScene);
        dialog.setScene(dialogScene);
        dialog.showAndWait();
    }

    private void connectToDatabase() {
        DbConnectionInfo selected = connectionListView.getSelectionModel().getSelectedItem();
        if (selected == null) {
            log("Подключение не выбрано");
            return;
        }

        // Устанавливаем желтый индикатор (в процессе)
        updateConnectionStatus(selected, false);
        ((Circle)((HBox)((ListCell<DbConnectionInfo>)connectionListView.lookup(".list-cell:selected")).getGraphic()).getChildren().get(1)).setFill(Color.YELLOW);

        try {
            if (currentConnection != null && !currentConnection.isClosed()) {
                currentConnection.close();
            }
            currentConnection = DriverManager.getConnection(
                    selected.getUrl(), selected.getUsername(), selected.getPassword()
            );
            log("Подключено к " + selected.getName());
            updateConnectionStatus(selected, true); // Зеленый при успехе
        } catch (SQLException e) {
            log("Ошибка подключения: " + e.getMessage());
            updateConnectionStatus(selected, false); // Красный при ошибке
        }
    }

    private void testConnection() {
        DbConnectionInfo selected = connectionListView.getSelectionModel().getSelectedItem();
        if (selected == null) {
            log("Подключение не выбрано для тестирования");
            return;
        }

        // Устанавливаем желтый индикатор (в процессе)
        updateConnectionStatus(selected, false);
        ((Circle)((HBox)((ListCell<DbConnectionInfo>)connectionListView.lookup(".list-cell:selected")).getGraphic()).getChildren().get(1)).setFill(Color.YELLOW);

        try (Connection conn = DriverManager.getConnection(selected.getUrl(), selected.getUsername(), selected.getPassword())) {
            log("Тест подключения успешен к " + selected.getName());
            updateConnectionStatus(selected, true); // Зеленый при успехе
        } catch (SQLException e) {
            log("Ошибка теста подключения: " + e.getMessage());
            updateConnectionStatus(selected, false); // Красный при ошибке
        }
    }

    /*private void testConnection() {
        DbConnectionInfo selected = connectionListView.getSelectionModel().getSelectedItem();
        if (selected == null) {
            log("Подключение не выбрано для тестирования");
            return;
        }
        try (Connection conn = DriverManager.getConnection(selected.getUrl(), selected.getUsername(), selected.getPassword())) {
            log("Тест подключения успешен к " + selected.getName());
        } catch (SQLException e) {
            log("Ошибка теста подключения: " + e.getMessage());
        }
    }*/

    private void saveCurrentQuery() {
        if (queryArea.getText() == null || queryArea.getText().isEmpty()) {
            log("Пустой запрос не может быть сохранён");
            return;
        }

        Stage dialog = new Stage();
        dialog.initModality(Modality.APPLICATION_MODAL);
        dialog.initOwner(scene.getWindow());
        dialog.setTitle("Сохранение запроса");

        Label label = new Label("Введите название для запроса:");
        TextField nameField = new TextField();
        Button okButton = new Button("OK");

        okButton.setOnAction(e -> {
            if (!nameField.getText().isEmpty()) {
                SavedQuery newQuery = new SavedQuery(nameField.getText(), queryArea.getText());
                savedQueries.add(newQuery);
                querySelector.getItems().add(newQuery);
                saveQueries();
                dialog.close();
            }
        });

        VBox vbox = new VBox(10, label, nameField, okButton);
        vbox.setPadding(new Insets(10));

        Scene dialogScene = new Scene(vbox);
        applySettings(dialogScene);
        dialog.setScene(dialogScene);
        dialog.showAndWait();
    }

    private void loadSelectedQuery() {
        SavedQuery selected = querySelector.getValue();
        if (selected != null) {
            queryArea.setText(selected.getSql());
        }
    }

    private void executeQuery() {
        if (currentConnection == null) {
            log("Нет активного подключения к БД");
            return;
        }
        if (queryArea == null || queryArea.getText().isEmpty()) {
            log("Запрос пустой или не создан");
            return;
        }
        try (Statement stmt = currentConnection.createStatement()) {
            boolean result = stmt.execute(queryArea.getText());
            if (result) {
                ResultSet rs = stmt.getResultSet();
                displayResultSet(rs);
                log("Запрос выполнен успешно (ResultSet)");
            } else {
                int updateCount = stmt.getUpdateCount();
                resultTable.getItems().clear();
                resultTable.getColumns().clear();
                log("Запрос выполнен успешно (обновлено строк: " + updateCount + ")");
            }
        } catch (SQLException e) {
            log("Ошибка выполнения запроса: " + e.getMessage());
        }
    }

    private void displayResultSet(ResultSet rs) throws SQLException {
        resultTable.getItems().clear();
        resultTable.getColumns().clear();

        // 1. Колонка с номерами строк
        TableColumn<List<String>, String> indexColumn = new TableColumn<>("#");
        indexColumn.setCellValueFactory(param -> {
            int rowIndex = resultTable.getItems().indexOf(param.getValue()) + 1;
            return new SimpleStringProperty(String.valueOf(rowIndex));
        });
        indexColumn.setCellFactory(col -> new TableCell<>() {
            @Override
            protected void updateItem(String item, boolean empty) {
                super.updateItem(item, empty);
                if (empty || item == null) {
                    setText(null);
                } else {
                    setText(item);
                    setStyle("-fx-alignment: CENTER; -fx-font-weight: bold;");
                }
            }
        });
        indexColumn.setPrefWidth(50);
        indexColumn.setResizable(false);
        indexColumn.setSortable(false);
        resultTable.getColumns().add(indexColumn);

        // 2. Основные колонки с данными
        ResultSetMetaData metaData = rs.getMetaData();
        int columnCount = metaData.getColumnCount();

        for (int i = 1; i <= columnCount; i++) {
            final int colIndex = i;
            TableColumn<List<String>, String> column = new TableColumn<>(metaData.getColumnName(i));

            // Установка значения ячейки
            column.setCellValueFactory(param -> {
                List<String> row = param.getValue();
                String value = row.get(colIndex - 1);
                return new SimpleStringProperty(value != null ? value : "NULL");
            });

            // Фабрика ячеек с переносом текста
            column.setCellFactory(tc -> new TableCell<>() {
                private Text text;

                @Override
                protected void updateItem(String item, boolean empty) {
                    super.updateItem(item, empty);
                    if (empty || item == null) {
                        setGraphic(null);
                        setText(null);
                    } else {
                        if (text == null) {
                            text = new Text(item);
                            text.wrappingWidthProperty().bind(column.widthProperty().subtract(10));
                            text.setStyle("-fx-font-size: " + currentFontSize + "px;");
                        } else {
                            text.setText(item);
                        }
                        setGraphic(text);
                    }
                }
            });

            // Настройки выравнивания для числовых типов
            String columnType = metaData.getColumnTypeName(i).toLowerCase();
            if (columnType.matches(".*(int|num|dec|float|double).*")) {
                column.setStyle("-fx-alignment: CENTER-RIGHT;");
            }

            column.setPrefWidth(150);
            resultTable.getColumns().add(column);
        }

        // 3. Заполнение данными
        while (rs.next()) {
            List<String> row = new ArrayList<>();
            for (int i = 1; i <= columnCount; i++) {
                row.add(rs.getString(i));
            }
            resultTable.getItems().add(row);
        }

        // 4. Настройка фиксированной высоты строк
        resultTable.setFixedCellSize(30);
        resultTable.setStyle("-fx-fixed-cell-size: 30px;");
    }

    private void autoResizeColumns() {
        for (TableColumn<List<String>, ?> column : resultTable.getColumns()) {
            if (column.getText().equals("#")) continue;

            double max = column.getPrefWidth();
            Font font = Font.font(currentFontSize);

            // Проверяем заголовок
            Text header = new Text(column.getText());
            header.setFont(font);
            max = Math.max(max, header.getLayoutBounds().getWidth() + 30);

            // Проверяем первые 20 строк данных
            for (int i = 0; i < Math.min(20, resultTable.getItems().size()); i++) {
                List<String> row = resultTable.getItems().get(i);
                int colIndex = resultTable.getColumns().indexOf(column) - 1;
                if (colIndex >= 0 && colIndex < row.size()) {
                    Text text = new Text(row.get(colIndex));
                    text.setFont(font);
                    double width = text.getLayoutBounds().getWidth() + 30;
                    max = Math.min(Math.max(max, width), 500); // Ограничение максимум 500
                }
            }

            column.setPrefWidth(max);
        }
    }

    private void saveConnections() {
        // Шифруем пароли перед сохранением
        List<DbConnectionInfo> connectionsToSave = new ArrayList<>();
        for (DbConnectionInfo conn : connections) {
            DbConnectionInfo encryptedConn = new DbConnectionInfo(
                    conn.getName(),
                    conn.getType(),
                    conn.getUrl(),
                    conn.getUsername(),
                    "ENC:" + Base64.getEncoder().encodeToString(
                            conn.getPassword().getBytes(StandardCharsets.UTF_8)
                    )
            );
            connectionsToSave.add(encryptedConn);
        }

        try {
            mapper.writeValue(connectionsFile, connectionsToSave);
        } catch (IOException e) {
            log("Ошибка сохранения подключений: " + e.getMessage());
        }
    }

    private void saveQueries() {
        try {
            mapper.writeValue(queriesFile, savedQueries);
        } catch (IOException e) {
            log("Ошибка сохранения запросов: " + e.getMessage());
        }
    }

    private void loadConnections() {
        // Выносим нужные поля в локальные effectively final переменные
        File fileToLoad = this.connectionsFile;
        ObjectMapper jsonMapper = this.mapper;

        new Thread(() -> {
            try {
                if (!fileToLoad.exists()) {
                    Platform.runLater(() -> connections = new ArrayList<>());
                    return;
                }

                List<DbConnectionInfo> loadedConnections = jsonMapper.readValue(
                        fileToLoad,
                        new TypeReference<List<DbConnectionInfo>>() {}
                );

                decryptPasswords(loadedConnections);

                Platform.runLater(() -> {
                    this.connections = loadedConnections != null ? loadedConnections : new ArrayList<>();
                    connectionListView.getItems().setAll(this.connections);
                });

            } catch (IOException e) {
                Platform.runLater(() -> {
                    log("Ошибка загрузки подключений: " + e.getMessage());
                    connections = new ArrayList<>();
                });
            }
        }).start();
    }

    private void createBackup() throws IOException {
        Path backupPath = Paths.get("connections_backup_" +
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")) + ".json");
        Files.copy(connectionsFile.toPath(), backupPath);
    }

    private void decryptPasswords(List<DbConnectionInfo> connections) {
        if (connections == null) return;

        for (DbConnectionInfo conn : connections) {
            DbConnectionInfo finalConn = conn; // Создаем effectively final копию
            try {
                if (finalConn.getPassword() != null && finalConn.getPassword().startsWith("ENC:")) {
                    String encrypted = finalConn.getPassword().substring(4);
                    String decrypted = new String(
                            Base64.getDecoder().decode(encrypted),
                            StandardCharsets.UTF_8
                    );
                    finalConn.setPassword(decrypted);
                }
            } catch (Exception e) {
                log("Ошибка дешифровки пароля для подключения " + finalConn.getName());
                finalConn.setPassword("");
            }
        }
    }

    private void loadQueries() {
        if (queriesFile.exists()) {
            try {
                savedQueries = mapper.readValue(queriesFile, new TypeReference<List<SavedQuery>>() {});
                querySelector.getItems().clear();
                querySelector.getItems().addAll(savedQueries);
                log("Загружено запросов: " + savedQueries.size());
            } catch (IOException e) {
                log("Ошибка загрузки запросов: " + e.getMessage());
            }
        } else {
            log("Файл queries.json не найден");
        }
    }


    private void log(String message) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        String fullMessage = timestamp + " - " + message;
        logArea.appendText(fullMessage + "\n");
        try (FileWriter fw = new FileWriter("dbclient.log", true)) {
            fw.write(fullMessage + "\n");
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public static void main(String[] args) {
        launch(args);
    }

    @Override
    public void stop() {
        saveConnections();
        saveQueries();
    }
}


