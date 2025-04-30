package com.example.dbclient;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import javafx.application.Application;
import javafx.beans.property.SimpleStringProperty;
import javafx.geometry.Insets;
import javafx.scene.Scene;
import javafx.scene.control.*;
import javafx.scene.input.ClipboardContent;
import javafx.scene.input.Dragboard;
import javafx.scene.input.TransferMode;
import javafx.scene.layout.*;
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
import java.nio.file.Paths;
import java.sql.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
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
        Button settingsButton = new Button("⚙");
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
        connectionListView.setCellFactory(lv -> {
            ListCell<DbConnectionInfo> cell = new ListCell<>() {
                @Override
                protected void updateItem(DbConnectionInfo item, boolean empty) {
                    super.updateItem(item, empty);
                    setText(empty || item == null ? null : item.getName());
                }
            };

            cell.setOnDragDetected(event -> {
                if (!cell.isEmpty()) {
                    Dragboard db = cell.startDragAndDrop(TransferMode.MOVE);
                    ClipboardContent content = new ClipboardContent();
                    content.putString(cell.getItem().getName());
                    db.setContent(content);
                    event.consume();
                }
            });

            cell.setOnDragOver(event -> {
                if (event.getGestureSource() != cell && event.getDragboard().hasString()) {
                    event.acceptTransferModes(TransferMode.MOVE);
                }
                event.consume();
            });

            cell.setOnDragDropped(event -> {
                if (cell.getItem() == null) return;

                int draggedIdx = connectionListView.getItems().indexOf(
                        connectionListView.getItems().stream().filter(i -> i.getName().equals(event.getDragboard().getString())).findFirst().orElse(null)
                );
                int thisIdx = connectionListView.getItems().indexOf(cell.getItem());

                if (draggedIdx >= 0) {
                    DbConnectionInfo item = connectionListView.getItems().remove(draggedIdx);
                    connectionListView.getItems().add(thisIdx, item);
                    connections.clear();
                    connections.addAll(connectionListView.getItems());
                    saveConnections();
                }
                event.setDropCompleted(true);
                event.consume();
            });

            return cell;
        });
    }

    private void openSettingsDialog(Window owner) {
        Stage dialog = new Stage();
        dialog.initModality(Modality.APPLICATION_MODAL);
        dialog.initOwner(owner);
        dialog.setTitle("Настройки");

        Slider fontSizeSlider = new Slider(10, 30, queryArea.getFont().getSize());
        fontSizeSlider.setShowTickLabels(true);
        fontSizeSlider.setShowTickMarks(true);

        ToggleGroup themeGroup = new ToggleGroup();
        RadioButton lightTheme = new RadioButton("Светлая тема");
        RadioButton darkTheme = new RadioButton("Тёмная тема");
        lightTheme.setToggleGroup(themeGroup);
        darkTheme.setToggleGroup(themeGroup);

        if ("dark".equals(preferences.get("theme", "light"))) {
            darkTheme.setSelected(true);
        } else {
            lightTheme.setSelected(true);
        }

        Button applyButton = new Button("Применить");
        applyButton.setOnAction(e -> {
            double fontSize = fontSizeSlider.getValue();
            queryArea.setStyle("-fx-font-size: " + fontSize + "px;");
            preferences.putDouble("fontSize", fontSize);

            if (darkTheme.isSelected()) {
                scene.getRoot().setStyle("-fx-base: #2b2b2b; -fx-background: #2b2b2b; -fx-text-fill: #ffffff;");
                preferences.put("theme", "dark");
            } else {
                scene.getRoot().setStyle("");
                preferences.put("theme", "light");
            }
            dialog.close();
        });

        VBox vbox = new VBox(10, new Label("Размер шрифта:"), fontSizeSlider, lightTheme, darkTheme, applyButton);
        vbox.setPadding(new Insets(10));

        dialog.setScene(new Scene(vbox));
        dialog.showAndWait();
    }

    private void loadSettings() {
        double fontSize = preferences.getDouble("fontSize", 12);
        queryArea.setStyle("-fx-font-size: " + fontSize + "px;");

        String theme = preferences.get("theme", "light");
        if ("dark".equals(theme)) {
            scene.getRoot().setStyle("-fx-base: #2b2b2b; -fx-background: #2b2b2b; -fx-text-fill: #ffffff;");
        } else {
            scene.getRoot().setStyle("");
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

        dialog.setScene(new Scene(vbox));
        dialog.showAndWait();
    }

    private void connectToDatabase() {
        DbConnectionInfo selected = connectionListView.getSelectionModel().getSelectedItem();
        if (selected == null) {
            log("Подключение не выбрано");
            return;
        }
        try {
            if (currentConnection != null && !currentConnection.isClosed()) {
                currentConnection.close();
            }
            currentConnection = DriverManager.getConnection(
                    selected.getUrl(), selected.getUsername(), selected.getPassword()
            );
            log("Подключено к " + selected.getName());
        } catch (SQLException e) {
            log("Ошибка подключения: " + e.getMessage());
        }
    }

    private void testConnection() {
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
    }

    private void saveCurrentQuery() {
        if (queryArea.getText() == null || queryArea.getText().isEmpty()) {
            log("Пустой запрос не может быть сохранён");
            return;
        }
        TextInputDialog dialog = new TextInputDialog();
        dialog.setTitle("Сохранение запроса");
        dialog.setHeaderText("Введите название для запроса");

        dialog.showAndWait().ifPresent(name -> {
            SavedQuery newQuery = new SavedQuery(name, queryArea.getText());
            savedQueries.add(newQuery);
            querySelector.getItems().add(newQuery);
            saveQueries();
        });
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

        ResultSetMetaData metaData = rs.getMetaData();
        int columnCount = metaData.getColumnCount();

        for (int i = 1; i <= columnCount; i++) {
            final int colIndex = i;
            TableColumn<List<String>, String> column = new TableColumn<>(metaData.getColumnName(i));
            column.setCellValueFactory(data -> new SimpleStringProperty(data.getValue().get(colIndex - 1)));
            resultTable.getColumns().add(column);
        }

        while (rs.next()) {
            List<String> row = new ArrayList<>();
            for (int i = 1; i <= columnCount; i++) {
                row.add(rs.getString(i));
            }
            resultTable.getItems().add(row);
        }
    }

    private void saveConnections() {
        try {
            mapper.writeValue(connectionsFile, connections);
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
        if (connectionsFile.exists()) {
            try {
                connections = mapper.readValue(connectionsFile, new TypeReference<List<DbConnectionInfo>>() {});
                connectionListView.getItems().clear();
                connectionListView.getItems().addAll(connections);
            } catch (IOException e) {
                log("Ошибка загрузки подключений: " + e.getMessage());
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


